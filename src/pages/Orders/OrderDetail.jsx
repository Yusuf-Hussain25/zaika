import { createElement, useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { ArrowLeft, CircleCheck, Clock, MapPin, PartyPopper, RotateCcw, SearchX, StickyNote, XCircle } from "lucide-react";
import { toast } from "sonner";
import BillSummary from "../../components/food/BillSummary";
import { EmptyState, StatusPill } from "../../components/ui";
import { AddressBlock, OrderItems, OrderTimeline } from "../../components/orders/OrderParts";
import DeliveryMap, { riderProgress } from "../../components/orders/DeliveryMap";
import { PAYMENT_METHODS, arrivalTime, isActive } from "../../lib/orders";
import { useNow } from "../../lib/useNow";
import { useStore } from "../../context/StoreContext";
import { api } from "../../lib/api";
import { formatDateTime, formatPrice, formatTime, orderCode } from "../../lib/format";
import { useOrderActions } from "./useOrderActions";
import "./Orders.css";

const HEADLINES = {
    awaiting_payment: ["Waiting for payment", "Finish paying to send this order to the kitchen."],
    placed: ["Order received", "The kitchen has your order and will start cooking shortly."],
    preparing: ["Your food is being cooked", "Fresh from the stove, packed with care."],
    out_for_delivery: ["On the way to you", "Your rider has picked up the order."],
    delivered: ["Delivered. Enjoy your meal!", "Hope it hit the spot. Reorder anytime."],
    cancelled: ["Order cancelled", "Nothing will be charged for this order."],
};

const OrderDetail = () => {
    const { id } = useParams();
    const { state } = useLocation();
    const [params, setParams] = useSearchParams();
    const { settings, replaceCart } = useStore();
    const [order, setOrder] = useState(null);
    const [error, setError] = useState(null);
    const { reorder, cancel, busy } = useOrderActions(setOrder);
    const sessionId = params.get("session_id");
    const now = useNow();
    const active = order && isActive(order.status);

    useEffect(() => {
        const ctrl = new AbortController();
        // Back from Stripe: confirm the payment with the server first
        const first = sessionId
            ? api(`/orders/${id}/confirm-payment`, { method: "POST", signal: ctrl.signal }).then(({ order, cart }) => {
                  replaceCart(cart);
                  if (order.paid) toast.success("Payment received. Your order is with the kitchen!");
                  setParams({}, { replace: true });
                  return { order };
              })
            : api(`/orders/${id}`, { signal: ctrl.signal }).then(({ order }) =>
                  // An unpaid Razorpay order (tab closed mid-payment): ask the server to check with Razorpay
                  order.status === "awaiting_payment" && order.paymentMethod === "razorpay"
                      ? api(`/orders/${id}/confirm-payment`, { method: "POST", signal: ctrl.signal }).then(({ order: checked, cart }) => {
                            if (checked.paid) {
                                replaceCart(cart);
                                toast.success("Payment received. Your order is with the kitchen!");
                            }
                            return { order: checked };
                        })
                      : { order },
              );
        first.then(({ order }) => setOrder(order)).catch((err) => err.name !== "AbortError" && setError(err));
        return () => ctrl.abort();
    }, [id, sessionId, replaceCart, setParams]);

    // Live tracking: refresh every 15s while the order is moving and the tab is visible
    useEffect(() => {
        if (!active) return;
        const timer = setInterval(() => {
            if (document.visibilityState !== "visible") return;
            api(`/orders/${id}`)
                .then(({ order: next }) => {
                    setOrder((prev) => {
                        if (prev && prev.status !== next.status && next.status !== "cancelled") {
                            toast(HEADLINES[next.status][0], { description: `Order ${orderCode(next.number)}` });
                        }
                        return next;
                    });
                })
                .catch(() => {});
        }, 15000);
        return () => clearInterval(timer);
    }, [id, active]);

    if (error) {
        return (
            <div className="container page">
                <EmptyState icon={SearchX} title={error.status === 404 ? "Order not found" : "We couldn't load this order"} action={<Link to="/orders" className="btn btn-primary">See all orders</Link>}>
                    {error.status === 404 ? "It may belong to a different account." : error.message}
                </EmptyState>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="container page order-detail" aria-busy="true">
                <div className="skeleton" style={{ height: 34, width: 260, marginBottom: 24 }} />
                <div className="order-detail-grid">
                    <div className="skeleton" style={{ height: 380, borderRadius: 22 }} />
                    <div className="skeleton" style={{ height: 380, borderRadius: 22 }} />
                </div>
            </div>
        );
    }

    // Paid online, then cancelled: the API refunds before it cancels
    const refunded = order.status === "cancelled" && order.paid && order.paymentMethod !== "cod";
    const [headline, defaultSub] = HEADLINES[order.status];
    const sub = refunded ? "Your payment has been refunded. Banks usually take 5 to 7 days to show it." : defaultSub;
    const onTheWay = order.status === "out_for_delivery";
    // Once the rider has left, the map's arrival time is the promise
    const eta = onTheWay ? riderProgress(order, settings?.etaMinutes, now).arrival : arrivalTime(order, settings?.etaMinutes);
    const late = active && now > eta.getTime();

    return (
        <div className="container page order-detail">
            <Link to="/orders" className="btn btn-text order-back">
                <ArrowLeft size={16} /> All orders
            </Link>

            {state?.placed && (
                <div className="order-placed fade-up">
                    <PartyPopper size={22} />
                    <div>
                        <strong>Order placed!</strong>
                        <span> We&apos;ve sent it to the kitchen. This page updates by itself.</span>
                    </div>
                </div>
            )}

            <div className="page-head">
                <div>
                    <span className="eyebrow mono">{orderCode(order.number)}</span>
                    <h1>{headline}</h1>
                    <p>{sub}</p>
                </div>
                <StatusPill status={order.status} />
            </div>

            <div className="order-detail-grid">
                <section className="card order-track">
                    {active && order.status !== "awaiting_payment" && (
                        <div className={`order-eta ${late ? "is-late" : ""}`}>
                            <Clock size={20} />
                            <div>
                                <span>{late ? "Running a little late" : "Estimated arrival"}</span>
                                <strong>{late ? "Any minute now" : `by ${formatTime(eta)}`}</strong>
                            </div>
                        </div>
                    )}
                    {onTheWay && <DeliveryMap order={order} etaMinutes={settings?.etaMinutes} />}
                    <OrderTimeline order={order} />
                    <p className="subtle order-placed-at">Placed {formatDateTime(order.createdAt)}</p>
                    <div className="order-detail-actions">
                        {["placed", "awaiting_payment"].includes(order.status) && (
                            <button type="button" className="btn btn-ghost" onClick={() => cancel(order)} disabled={Boolean(busy)}>
                                {busy ? <span className="spinner" /> : <XCircle size={17} />} Cancel order
                            </button>
                        )}
                        {!active && (
                            <button type="button" className="btn btn-primary" onClick={() => reorder(order)} disabled={Boolean(busy)}>
                                {busy ? <span className="spinner" /> : <RotateCcw size={17} />} Reorder
                            </button>
                        )}
                    </div>
                </section>

                <div className="order-side">
                    <section className="card order-box">
                        <h2>Items</h2>
                        <OrderItems items={order.items} />
                        <BillSummary subtotal={order.subtotal} deliveryFee={order.deliveryFee} total={order.total} />
                    </section>
                    <section className="card order-box">
                        <h2>
                            <MapPin size={17} /> Delivering to
                        </h2>
                        <AddressBlock address={order.address} />
                        {order.note && (
                            <p className="order-note">
                                <StickyNote size={15} /> {order.note}
                            </p>
                        )}
                    </section>
                    <section className="card order-box order-payment">
                        {createElement(PAYMENT_METHODS[order.paymentMethod].icon, { size: 20 })}
                        <div>
                            <strong>{PAYMENT_METHODS[order.paymentMethod].label}</strong>
                            <span>
                                {refunded ? (
                                    `Refunded ${formatPrice(order.total)} to your ${order.paymentMethod === "card" ? "card" : "account"}`
                                ) : order.paid ? (
                                    <>
                                        <CircleCheck size={14} /> Paid {formatPrice(order.total)}
                                    </>
                                ) : order.status === "cancelled" ? (
                                    "Not charged"
                                ) : order.paymentMethod === "cod" ? (
                                    `Pay ${formatPrice(order.total)} at the door`
                                ) : (
                                    "Payment pending"
                                )}
                            </span>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default OrderDetail;
