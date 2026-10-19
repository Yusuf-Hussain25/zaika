import { query, sql } from "../db.js";

export const DEMO_DOMAIN = "zaika-demo.dev";

// The read-only demo admin is public, so it only sees contact details of seeded demo customers
const shouldMask = (viewer, email) => viewer?.role === "demo_admin" && !email.endsWith(`@${DEMO_DOMAIN}`);

const maskPhone = (p = "") => (p.length > 4 ? `${"•".repeat(p.length - 4)}${p.slice(-4)}` : "••••");
export const maskEmail = (e) => e.replace(/^(.).*(@.*)$/, "$1•••$2");

const toOrder = (o, items, events, viewer) => {
    const mask = shouldMask(viewer, o.customer_email);
    const address = { ...o.address };
    if (mask) {
        address.phone = maskPhone(address.phone);
        address.line1 = "Hidden in the demo";
        address.landmark = null;
    }
    return {
        id: o.id,
        number: Number(o.number),
        status: o.status,
        paymentMethod: o.payment_method,
        paid: o.paid,
        subtotal: o.subtotal,
        deliveryFee: o.delivery_fee,
        total: o.total,
        address,
        note: o.note,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        customer: { id: o.user_id, name: o.customer_name, email: mask ? maskEmail(o.customer_email) : o.customer_email },
        items: items.map((i) => ({
            foodId: i.food_id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            imageUrl: i.image_url,
            isVeg: i.is_veg,
        })),
        events: events.map((e) => ({ status: e.status, at: e.created_at })),
    };
};

// Loads orders with their items and status history. `where` uses $n placeholders bound to `params`.
export const fetchOrders = async ({ where = "true", params = [], limit = 100, viewer } = {}) => {
    const rows = await query(
        `select o.*, u.name as customer_name, u.email as customer_email
         from orders o join users u on u.id = o.user_id
         where ${where}
         order by o.created_at desc
         limit ${Math.min(Number(limit) || 100, 500)}`,
        params,
    );
    if (!rows.length) return [];
    const ids = rows.map((o) => o.id);
    const [items, events] = await Promise.all([
        sql`select * from order_items where order_id = any(${ids}::uuid[]) order by id`,
        sql`select * from order_events where order_id = any(${ids}::uuid[]) order by created_at, id`,
    ]);
    return rows.map((o) =>
        toOrder(
            o,
            items.filter((i) => i.order_id === o.id),
            events.filter((e) => e.order_id === o.id),
            viewer,
        ),
    );
};

export const fetchOrder = async (id, viewer) => (await fetchOrders({ where: "o.id = $1", params: [id], limit: 1, viewer }))[0];
