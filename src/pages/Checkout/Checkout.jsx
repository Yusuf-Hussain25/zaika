import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { AlertTriangle, ArrowLeft, Banknote, CreditCard, Lock, MapPin, NotebookPen, Smartphone } from "lucide-react";
import { toast } from "sonner";
import BillSummary from "../../components/food/BillSummary";
import { OrderItems } from "../../components/orders/OrderParts";
import { useAuth } from "../../context/AuthContext";
import { useStore } from "../../context/StoreContext";
import { api } from "../../lib/api";
import { formatPrice, orderCode } from "../../lib/format";
import { PaymentDismissed, payWithRazorpay } from "../../lib/razorpay";
import "../Cart/Cart.css";
import "./Checkout.css";

const FIELDS = [
    { key: "name", label: "Full name", autoComplete: "name", placeholder: "Riya Desai" },
    { key: "phone", label: "Phone", autoComplete: "tel", placeholder: "+91 98765 43210", inputMode: "tel" },
    { key: "line1", label: "Flat, building, street", autoComplete: "street-address", placeholder: "Flat 402, Sunrise Apartments, 12th Main", wide: true },
    { key: "landmark", label: "Landmark (optional)", placeholder: "Near the metro station", wide: true, optional: true },
    { key: "city", label: "City", autoComplete: "address-level2", placeholder: "Bengaluru" },
    { key: "pincode", label: "PIN code", autoComplete: "postal-code", placeholder: "560038", inputMode: "numeric", maxLength: 6 },
];

const validate = (a) => {
    const errors = {};
    for (const f of FIELDS) if (!f.optional && !String(a[f.key] || "").trim()) errors[f.key] = "Required";
    if (a.phone && !/^[+\d][\d\s-]{6,18}$/.test(a.phone.trim())) errors.phone = "Enter a valid phone number";
    if (a.pincode && !/^\d{6}$/.test(a.pincode.trim())) errors.pincode = "PIN code is 6 digits";
    return errors;
};

const Checkout = () => {
    const { user, setUser } = useAuth();
    const { lines, subtotal, deliveryFee, total, toFreeDelivery, settings, payments, soldOutInCart, cartSyncing, foodsState, replaceCart } = useStore();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [address, setAddress] = useState(() => ({
        name: user.address?.name ?? user.name,
        phone: user.address?.phone ?? user.phone ?? "",
        line1: user.address?.line1 ?? "",
        landmark: user.address?.landmark ?? "",
        city: user.address?.city ?? "",
        pincode: user.address?.pincode ?? "",
    }));
    const [note, setNote] = useState("");
    // Online payment is the default once we know Razorpay is set up
    const [picked, setMethod] = useState(null);
    const method = picked ?? (payments.razorpay ? "razorpay" : "cod");
    const [errors, setErrors] = useState({});
    const [placing, setPlacing] = useState(false);

    // Back from a cancelled Stripe checkout: drop the unpaid order, keep the cart
    const cancelledId = params.get("cancelled");
    useEffect(() => {
        if (!cancelledId) return;
        api(`/orders/${cancelledId}/cancel`, { method: "POST" }).catch(() => {});
        toast.info("Payment cancelled. Your cart is still here.");
        setParams({}, { replace: true });
    }, [cancelledId, setParams]);

    const loading = foodsState === "loading" || cartSyncing;
    if (!loading && !lines.length && !placing) return <Navigate to="/cart" replace />;

    const blocked = soldOutInCart.length > 0 || (settings && !settings.storeOpen);
    const set = (key) => (e) => {
        setAddress((a) => ({ ...a, [key]: e.target.value }));
        if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
    };

    const placeOrder = async (e) => {
        e.preventDefault();
        const found = validate(address);
        setErrors(found);
        if (Object.keys(found).length) {
            document.getElementById(`addr-${Object.keys(found)[0]}`)?.focus();
            return;
        }
        setPlacing(true);
        try {
            const { order, checkoutUrl, razorpay } = await api("/orders", {
                method: "POST",
                body: { address: { ...address, landmark: address.landmark || null }, note: note || null, paymentMethod: method },
            });
            if (checkoutUrl) {
                window.location.assign(checkoutUrl);
                return;
            }
            setUser((u) => ({ ...u, address: order.address }));
            if (razorpay) return payOnline(order, razorpay);
            replaceCart({});
            navigate(`/orders/${order.id}`, { replace: true, state: { placed: true } });
        } catch (err) {
            toast.error(err.message);
            setPlacing(false);
        }
    };

    // Razorpay Checkout, then the server checks the signature and asks Razorpay for the payment
    const payOnline = async (order, razorpay) => {
        try {
            const paid = await payWithRazorpay({
                ...razorpay,
                description: `Order ${orderCode(order.number)}`,
                prefill: { name: order.address.name, email: user.email, contact: order.address.phone.replace(/[\s-]/g, "") },
            });
            const { order: confirmed, cart } = await api(`/orders/${order.id}/confirm-payment`, {
                method: "POST",
                body: { razorpayPaymentId: paid.razorpay_payment_id, razorpaySignature: paid.razorpay_signature },
            });
            replaceCart(cart);
            if (!confirmed.paid) toast.info("We're waiting for Razorpay to confirm your payment. This page will update.");
            navigate(`/orders/${order.id}`, { replace: true, state: { placed: confirmed.paid } });
        } catch (err) {
            // Closed without paying: drop the unpaid order and keep the cart
            if (err instanceof PaymentDismissed) {
                api(`/orders/${order.id}/cancel`, { method: "POST" }).catch(() => {});
                toast.info("Payment cancelled. Your cart is still here.");
            } else {
                toast.error(err.message);
            }
            setPlacing(false);
        }
    };

    return (
        <div className="container page">
            <div className="page-head">
                <div>
                    <span className="eyebrow">Checkout</span>
                    <h1>Almost there</h1>
                    <p>Confirm where to deliver and how you&apos;d like to pay.</p>
                </div>
                <Link to="/cart" className="btn btn-ghost btn-sm">
                    <ArrowLeft size={16} /> Back to cart
                </Link>
            </div>

            <form className="cart-layout" onSubmit={placeOrder} noValidate>
                <div className="checkout-main">
                    <section className="card checkout-section">
                        <h2>
                            <MapPin size={19} /> Delivery address
                        </h2>
                        <div className="checkout-grid">
                            {FIELDS.map((f) => (
                                <div key={f.key} className={`field ${f.wide ? "wide" : ""}`}>
                                    <label htmlFor={`addr-${f.key}`}>{f.label}</label>
                                    <input
                                        id={`addr-${f.key}`}
                                        className="input"
                                        value={address[f.key] ?? ""}
                                        onChange={set(f.key)}
                                        placeholder={f.placeholder}
                                        autoComplete={f.autoComplete}
                                        inputMode={f.inputMode}
                                        maxLength={f.maxLength}
                                        aria-invalid={Boolean(errors[f.key])}
                                        aria-describedby={errors[f.key] ? `addr-${f.key}-err` : undefined}
                                    />
                                    {errors[f.key] && (
                                        <span id={`addr-${f.key}-err`} className="field-error">
                                            {errors[f.key]}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="field-hint">We&apos;ll save this address for next time.</p>
                    </section>

                    <section className="card checkout-section">
                        <h2>
                            <NotebookPen size={19} /> Note for the kitchen
                        </h2>
                        <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Less spicy please, no onions, ring the bell twice…" aria-label="Note for the kitchen" />
                    </section>

                    <section className="card checkout-section">
                        <h2>
                            <Lock size={19} /> Payment
                        </h2>
                        <div className="pay-options" role="radiogroup" aria-label="Payment method">
                            <button
                                type="button"
                                role="radio"
                                aria-checked={method === "razorpay"}
                                className="pay-option"
                                onClick={() => setMethod("razorpay")}
                                disabled={!payments.razorpay}
                                title={payments.razorpay ? undefined : "Online payments are not enabled on this demo"}
                            >
                                <span className="pay-icon">
                                    <Smartphone size={20} />
                                </span>
                                <span>
                                    <strong>UPI, cards &amp; netbanking</strong>
                                    <span>{payments.razorpay ? "Secure checkout with Razorpay" : "Not available on this demo"}</span>
                                </span>
                            </button>
                            <button type="button" role="radio" aria-checked={method === "cod"} className="pay-option" onClick={() => setMethod("cod")}>
                                <span className="pay-icon">
                                    <Banknote size={20} />
                                </span>
                                <span>
                                    <strong>Cash on delivery</strong>
                                    <span>Pay {formatPrice(total)} when your food arrives</span>
                                </span>
                            </button>
                            {payments.card && (
                                <button type="button" role="radio" aria-checked={method === "card"} className="pay-option" onClick={() => setMethod("card")}>
                                    <span className="pay-icon">
                                        <CreditCard size={20} />
                                    </span>
                                    <span>
                                        <strong>International card</strong>
                                        <span>Secure checkout with Stripe</span>
                                    </span>
                                </button>
                            )}
                        </div>
                    </section>
                </div>

                <aside className="card cart-summary">
                    <h2>Your order</h2>
                    {loading ? <div className="skeleton" style={{ height: 120 }} /> : <OrderItems items={lines.map((l) => ({ ...l.food, price: l.unitPrice, quantity: l.quantity, options: l.options }))} />}
                    <BillSummary subtotal={subtotal} deliveryFee={deliveryFee} total={total} freeDeliveryOver={settings?.freeDeliveryOver} toFreeDelivery={toFreeDelivery} />
                    {blocked && (
                        <p className="cart-warning">
                            <AlertTriangle size={16} />
                            {soldOutInCart.length ? "Some dishes in your cart are sold out." : "The kitchen is closed right now."}
                        </p>
                    )}
                    <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={placing || loading || blocked}>
                        {placing && <span className="spinner" />}
                        {method === "cod" ? `Place order · ${formatPrice(total)}` : `Pay ${formatPrice(total)}`}
                    </button>
                    {settings && <p className="subtle cart-note">Estimated delivery in about {settings.etaMinutes} minutes</p>}
                </aside>
            </form>
        </div>
    );
};

export default Checkout;
