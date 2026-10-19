import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronRight, Package, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, StatusPill } from "../../components/ui";
import { OrderThumbs } from "../../components/orders/OrderParts";
import { isActive, itemsSummary } from "../../lib/orders";
import { api } from "../../lib/api";
import { formatDateTime, formatPrice, orderCode, plural, timeAgo } from "../../lib/format";
import { useOrderActions } from "./useOrderActions";
import { ORDER_FLOW } from "../../../shared/menu";
import "./Orders.css";

const Progress = ({ status }) => {
    const step = ORDER_FLOW.indexOf(status);
    return (
        <div className="order-progress" aria-hidden="true">
            {ORDER_FLOW.map((s, i) => (
                <span key={s} className={i <= step ? "on" : ""} />
            ))}
        </div>
    );
};

const OrderCard = ({ order, actions }) => {
    const { reorder, cancel, busy } = actions;
    const active = isActive(order.status);
    const count = order.items.reduce((n, i) => n + i.quantity, 0);
    return (
        <article className={`card order-card ${active ? "is-active" : ""}`}>
            <Link to={`/orders/${order.id}`} className="order-card-main">
                <OrderThumbs items={order.items} />
                <div className="order-card-info">
                    <div className="order-card-top">
                        <strong className="mono">{orderCode(order.number)}</strong>
                        <StatusPill status={order.status} />
                    </div>
                    <p className="order-card-items">{itemsSummary(order.items)}</p>
                    <span className="subtle order-card-meta">
                        <time dateTime={order.createdAt} title={formatDateTime(order.createdAt)}>
                            {timeAgo(order.createdAt)}
                        </time>{" "}
                        · {plural(count, "item")} · <span className="num">{formatPrice(order.total)}</span>
                    </span>
                    {active && order.status !== "awaiting_payment" && <Progress status={order.status} />}
                </div>
                <ChevronRight size={20} className="order-card-chevron" />
            </Link>
            <div className="order-card-actions">
                {["placed", "awaiting_payment"].includes(order.status) && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => cancel(order)} disabled={Boolean(busy)}>
                        {busy === `cancel:${order.id}` ? <span className="spinner" /> : <XCircle size={15} />} Cancel
                    </button>
                )}
                {!active && (
                    <button type="button" className="btn btn-soft btn-sm" onClick={() => reorder(order)} disabled={Boolean(busy)}>
                        {busy === `reorder:${order.id}` ? <span className="spinner" /> : <RotateCcw size={15} />} Reorder
                    </button>
                )}
                {active && (
                    <Link to={`/orders/${order.id}`} className="btn btn-primary btn-sm">
                        Track order <ArrowRight size={15} />
                    </Link>
                )}
            </div>
        </article>
    );
};

const OrdersSkeleton = () =>
    [0, 1, 2].map((i) => (
        <div key={i} className="card order-card" aria-hidden="true">
            <div className="order-card-main">
                <span className="skeleton" style={{ width: 80, height: 46, borderRadius: 14 }} />
                <div className="order-card-info">
                    <span className="skeleton" style={{ height: 14, width: "40%" }} />
                    <span className="skeleton" style={{ height: 12, width: "80%" }} />
                    <span className="skeleton" style={{ height: 12, width: "30%" }} />
                </div>
            </div>
        </div>
    ));

const Orders = () => {
    const [orders, setOrders] = useState(null);
    const [error, setError] = useState(null);
    const actions = useOrderActions((updated) => setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o))));

    useEffect(() => {
        const ctrl = new AbortController();
        const load = () =>
            api("/orders", { signal: ctrl.signal })
                .then(({ orders }) => setOrders(orders))
                .catch((err) => {
                    if (err.name === "AbortError") return;
                    setError(err.message);
                    toast.error(err.message);
                });
        load();
        // Keep statuses fresh while the page is open and visible
        const timer = setInterval(() => document.visibilityState === "visible" && load(), 20000);
        return () => {
            ctrl.abort();
            clearInterval(timer);
        };
    }, []);

    const active = orders?.filter((o) => isActive(o.status)) ?? [];
    const past = orders?.filter((o) => !isActive(o.status)) ?? [];

    return (
        <div className="container page orders-page">
            <div className="page-head">
                <div>
                    <span className="eyebrow">My orders</span>
                    <h1>Your Zaika history</h1>
                    {orders && orders.length > 0 && <p>{plural(orders.length, "order")} so far. Tap one to see its timeline.</p>}
                </div>
            </div>

            {!orders && !error && <div className="orders-list"><OrdersSkeleton /></div>}

            {error && !orders && (
                <EmptyState icon={Package} title="We couldn't load your orders" action={<button className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button>}>
                    {error}
                </EmptyState>
            )}

            {orders && !orders.length && (
                <EmptyState icon={Package} title="No orders yet" action={<Link to="/" className="btn btn-primary">Explore the menu <ArrowRight size={17} /></Link>}>
                    Your first biryani is a few taps away. Orders show up here with live tracking.
                </EmptyState>
            )}

            {active.length > 0 && (
                <section className="orders-group">
                    <h2>
                        <span className="live-dot" /> In progress
                    </h2>
                    <div className="orders-list">
                        {active.map((o) => (
                            <OrderCard key={o.id} order={o} actions={actions} />
                        ))}
                    </div>
                </section>
            )}

            {past.length > 0 && (
                <section className="orders-group">
                    <h2>Past orders</h2>
                    <div className="orders-list">
                        {past.map((o) => (
                            <OrderCard key={o.id} order={o} actions={actions} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default Orders;
