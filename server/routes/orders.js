import { Router } from "express";
import { randomUUID } from "node:crypto";
import { sql, transaction } from "../db.js";
import { HttpError, badRequest, cleanAddress, cleanId, cleanText, notFound } from "../lib/http.js";
import { isStaff, requireAuth } from "../lib/auth.js";
import { CURRENCY, deliveryFeeFor, getStripe, readSettings } from "../lib/store.js";
import { fetchOrder, fetchOrders } from "../lib/orders.js";
import { addLines, readCart } from "./cart.js";
import { cleanChoice, optionsLabel, snapshotChoice, unitPrice } from "../../shared/menu.js";
import { withAutopilot } from "../lib/autopilot.js";
import { createRazorpayOrder, findPayment, razorpayKeys, refundRazorpay, validSignature } from "../lib/razorpay.js";
import { refundOrder } from "../lib/payments.js";

const router = Router();
router.use(requireAuth);

const ownOrder = async (req) => {
    const order = await fetchOrder(cleanId(req.params.id, "Order"), req.user);
    if (!order || (order.customer.id !== req.user.id && !isStaff(req.user))) throw notFound("Order not found.");
    return order;
};

// Where Stripe sends the customer back to. APP_URL wins so a forged Origin header can't redirect elsewhere.
const appUrl = (req) => (process.env.APP_URL || req.get("origin") || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");

router.get("/", withAutopilot, async (req, res) => {
    res.json({ orders: await fetchOrders({ where: "o.user_id = $1", params: [req.user.id], limit: 50, viewer: req.user }) });
});

router.get("/:id", withAutopilot, async (req, res) => {
    res.json({ order: await ownOrder(req) });
});

// Places an order from the saved cart. Prices and fees come from the database, never from the browser.
router.post("/", async (req, res) => {
    const settings = await readSettings();
    if (!settings.storeOpen) throw new HttpError(409, "Zaika's kitchen is closed right now. Please try again later.");

    const address = cleanAddress(req.body.address);
    const note = cleanText(req.body.note, { field: "Note", max: 200, optional: true });
    const method = ["card", "razorpay"].includes(req.body.paymentMethod) ? req.body.paymentMethod : "cod";
    const stripe = method === "card" ? getStripe() : null;
    if (method === "card" && !stripe) throw badRequest("Card payments are not available. Please choose cash on delivery.");
    if (method === "razorpay" && !razorpayKeys()) throw badRequest("Online payments are not available. Please choose cash on delivery.");

    const rows = await sql`
        select f.*, c.quantity, c.choice from cart_items c join foods f on f.id = c.food_id
        where c.user_id = ${req.user.id} order by f.name, c.line_id`;
    // Each line's price is the dish (or half portion) plus its add-ons, from today's menu
    const lines = rows.map((l) => {
        const choice = cleanChoice(l, l.choice);
        const options = snapshotChoice(l, choice);
        return { ...l, unit: unitPrice(l, choice), options, label: optionsLabel(options) };
    });
    if (!lines.length) throw badRequest("Your cart is empty.");
    const soldOut = lines.filter((l) => !l.is_available).map((l) => l.name);
    if (soldOut.length) throw badRequest(`${soldOut.join(", ")} ${soldOut.length > 1 ? "are" : "is"} sold out. Remove ${soldOut.length > 1 ? "them" : "it"} to continue.`);

    const subtotal = lines.reduce((sum, l) => sum + l.unit * l.quantity, 0);
    const deliveryFee = deliveryFeeFor(subtotal, settings);
    const total = subtotal + deliveryFee;
    const id = randomUUID();
    const status = method === "cod" ? "placed" : "awaiting_payment";

    await transaction((tx) => [
        tx`insert into orders (id, user_id, status, payment_method, subtotal, delivery_fee, total, address, note)
           values (${id}, ${req.user.id}, ${status}, ${method}, ${subtotal}, ${deliveryFee}, ${total}, ${JSON.stringify(address)}::jsonb, ${note})`,
        tx`insert into order_items (order_id, food_id, name, price, quantity, image_url, is_veg, options)
           select ${id}, g.food_id, g.name, g.price, g.quantity, g.image_url, g.is_veg, g.options::jsonb from unnest(
             ${lines.map((l) => l.id)}::uuid[], ${lines.map((l) => l.name)}::text[], ${lines.map((l) => l.unit)}::int[],
             ${lines.map((l) => l.quantity)}::int[], ${lines.map((l) => l.image_url)}::text[], ${lines.map((l) => l.is_veg)}::boolean[],
             ${lines.map((l) => (l.options ? JSON.stringify(l.options) : null))}::text[])
             as g(food_id, name, price, quantity, image_url, is_veg, options)`,
        tx`insert into order_events (order_id, status) values (${id}, ${status})`,
        // Online orders keep the cart until payment succeeds, so a cancelled checkout loses nothing
        ...(method === "cod" ? [tx`delete from cart_items where user_id = ${req.user.id}`] : []),
        tx`update users set address = ${JSON.stringify(address)}::jsonb, phone = coalesce(phone, ${address.phone}) where id = ${req.user.id}`,
    ]);

    // Undoes an order whose payment could not even be started
    const abandon = async (err, provider) => {
        await transaction((tx) => [
            tx`update orders set status = 'cancelled', updated_at = now() where id = ${id}`,
            tx`insert into order_events (order_id, status) values (${id}, 'cancelled')`,
        ]);
        throw new HttpError(502, `Could not start ${provider} payment: ${err.message.replace(/^Razorpay: /, "")}`);
    };

    if (method === "razorpay") {
        try {
            const [{ number }] = await sql`select number from orders where id = ${id}`;
            const rzp = await createRazorpayOrder({ amount: total, receipt: `ZK-${number}`, notes: { orderId: id } });
            await sql`update orders set razorpay_order_id = ${rzp.id} where id = ${id}`;
            return res.status(201).json({
                order: await fetchOrder(id, req.user),
                razorpay: { keyId: razorpayKeys().id, orderId: rzp.id, amount: rzp.amount, currency: rzp.currency },
            });
        } catch (err) {
            await abandon(err, "Razorpay");
        }
    }

    if (method === "card") {
        try {
            const base = appUrl(req);
            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                client_reference_id: id,
                metadata: { orderId: id },
                customer_email: req.user.email,
                line_items: [
                    ...lines.map((l) => ({
                        quantity: l.quantity,
                        price_data: { currency: CURRENCY, unit_amount: l.unit * 100, product_data: { name: l.label ? `${l.name} (${l.label})` : l.name } },
                    })),
                    ...(deliveryFee
                        ? [{ quantity: 1, price_data: { currency: CURRENCY, unit_amount: deliveryFee * 100, product_data: { name: "Delivery fee" } } }]
                        : []),
                ],
                success_url: `${base}/orders/${id}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${base}/checkout?cancelled=${id}`,
            });
            await sql`update orders set stripe_session_id = ${session.id} where id = ${id}`;
            return res.status(201).json({ order: await fetchOrder(id, req.user), checkoutUrl: session.url });
        } catch (err) {
            await abandon(err, "card");
        }
    }

    res.status(201).json({ order: await fetchOrder(id, req.user), cart: {} });
});

// Marks an online order paid and sends it to the kitchen
const markPaid = (order, extra = []) =>
    transaction((tx) => [
        tx`update orders set paid = true, status = case when status = 'awaiting_payment' then 'placed' else status end, updated_at = now() where id = ${order.id}`,
        ...(order.status === "awaiting_payment" ? [tx`insert into order_events (order_id, status) values (${order.id}, 'placed')`] : []),
        tx`delete from cart_items where user_id = ${order.customer.id}`,
        ...extra.map((build) => build(tx)),
    ]);

// Called after Razorpay Checkout succeeds (with its signature), when Stripe redirects back, or when
// an unpaid order is reopened. Trusts only what the payment provider reports for this order.
router.post("/:id/confirm-payment", async (req, res) => {
    const order = await ownOrder(req);
    if (order.paid || order.paymentMethod === "cod") return res.json({ order, cart: await readCart(req.user.id) });

    if (order.paymentMethod === "razorpay") {
        const [{ razorpay_order_id: rzpOrderId }] = await sql`select razorpay_order_id from orders where id = ${order.id}`;
        if (!rzpOrderId || !razorpayKeys()) throw badRequest("This order has no online payment to confirm.");
        const { razorpayPaymentId: paymentId, razorpaySignature: signature } = req.body || {};
        // A signature that doesn't match is a forged or mixed-up confirmation
        if (paymentId && !validSignature(rzpOrderId, paymentId, signature)) throw badRequest("We couldn't verify this payment. If money was taken, it will be refunded.");
        // Either way, Razorpay itself must report the full amount as paid
        const payment = order.status === "cancelled" ? null : await findPayment(rzpOrderId, order.total);
        if (payment) {
            await markPaid(order, [(tx) => tx`update orders set razorpay_payment_id = ${payment.id} where id = ${order.id}`]);
        }
        return res.json({ order: await fetchOrder(order.id, req.user), cart: await readCart(req.user.id) });
    }

    const stripe = getStripe();
    const [{ stripe_session_id: sessionId }] = await sql`select stripe_session_id from orders where id = ${order.id}`;
    if (!stripe || !sessionId) throw badRequest("This order has no card payment to confirm.");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid" && session.metadata?.orderId === order.id) await markPaid(order);
    res.json({ order: await fetchOrder(order.id, req.user), cart: await readCart(req.user.id) });
});

// Customers can cancel until the kitchen starts cooking
router.post("/:id/cancel", async (req, res) => {
    const order = await ownOrder(req);
    if (order.customer.id !== req.user.id) throw notFound("Order not found.");
    if (!["awaiting_payment", "placed"].includes(order.status)) {
        throw badRequest("This order is already being prepared and can't be cancelled.");
    }
    const [row] = await sql`select * from orders where id = ${order.id}`;
    await refundOrder(row);
    // A UPI payment can complete after the customer closed Razorpay Checkout; give that money back
    if (!row.paid && row.payment_method === "razorpay" && row.razorpay_order_id && razorpayKeys()) {
        const late = await findPayment(row.razorpay_order_id, row.total).catch(() => null);
        if (late) await refundRazorpay(late.id);
    }
    await transaction((tx) => [
        tx`update orders set status = 'cancelled', updated_at = now() where id = ${order.id}`,
        tx`insert into order_events (order_id, status) values (${order.id}, 'cancelled')`,
    ]);
    res.json({ order: await fetchOrder(order.id, req.user) });
});

// Puts a past order's dishes back in the cart with the same options (skipping anything sold out
// or removed, and any add-on the dish no longer offers)
router.post("/:id/reorder", async (req, res) => {
    const order = await ownOrder(req);
    const added = await addLines(
        req.user.id,
        order.items
            .filter((i) => i.foodId)
            .map((i) => ({
                foodId: i.foodId,
                quantity: i.quantity,
                choice: i.options && { portion: i.options.portion, spice: i.options.spice, addons: i.options.addons.map((a) => a.id) },
            })),
    );
    res.json({ cart: await readCart(req.user.id), added, skipped: order.items.length - added });
});

export default router;
