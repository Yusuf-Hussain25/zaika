import { useDeferredValue, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { ArrowRight, Banknote, Bike, ChefHat, CircleCheck, ClipboardList, CreditCard, Inbox, Phone, Search, StickyNote, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Drawer, EmptyState, Modal, StatusPill } from "../../components/ui";
import { AddressBlock, OrderItems, OrderTimeline } from "../../components/orders/OrderParts";
import BillSummary from "../../components/food/BillSummary";
import DeliveryMap from "../../components/orders/DeliveryMap";
import { useStore } from "../../context/StoreContext";
import { useAuth } from "../../context/AuthContext";
import { useAdminData } from "./AdminData";
import { api } from "../../lib/api";
import { formatDateTime, formatPrice, orderCode, plural, timeAgo } from "../../lib/format";
import { itemsSummary } from "../../lib/orders";
import { useNow } from "../../lib/useNow";
import { ORDER_STATUS, nextStatus } from "../../../shared/menu";

const COLUMNS = [
    { status: "placed", title: "New", icon: Inbox, hint: "Accept and start cooking", warnAfter: 5 },
    { status: "preparing", title: "In the kitchen", icon: ChefHat, hint: "Being cooked", warnAfter: 20 },
    { status: "out_for_delivery", title: "On the way", icon: Bike, hint: "With the rider", warnAfter: 30 },
];

const ACTION_LABEL = { preparing: "Start preparing", out_for_delivery: "Send out", delivered: "Mark delivered" };

const HISTORY_FILTERS = [
    { id: "all", label: "All" },
    { id: "delivered", label: "Delivered" },
    { id: "cancelled", label: "Cancelled" },
    { id: "active", label: "Active" },
];

const minutesSince = (date, now) => Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000));

// Advance / cancel with optimistic feedback; shared by tickets and the drawer
const useOrderUpdate = (onUpdated) => {
    const { upsert } = useAdminData();
    const [busy, setBusy] = useState(null);
    const update = async (order, status) => {
        setBusy(`${order.id}:${status}`);
        try {
            const { order: next } = await api(`/admin/orders/${order.id}`, { method: "PATCH", body: { status } });
            upsert(next);
            onUpdated?.(next);
            toast.success(`${orderCode(next.number)} · ${ORDER_STATUS[next.status].label}`);
            return next;
        } catch (err) {
            toast.error(err.message);
            return null;
        } finally {
            setBusy(null);
        }
    };
    return { update, busy };
};

const Ticket = ({ order, column, now, onOpen, onAdvance, busy, readOnly, fresh }) => {
    const next = nextStatus(order.status);
    const waited = minutesSince(order.updatedAt, now);
    const late = waited >= column.warnAfter;
    return (
        <article className={`ticket ${fresh ? "is-fresh" : ""}`}>
            <button type="button" className="ticket-main" onClick={() => onOpen(order)} aria-label={`Open order ${orderCode(order.number)}`}>
                <div className="ticket-top">
                    <strong className="mono">{orderCode(order.number)}</strong>
                    <span className={`ticket-wait ${late ? "late" : ""}`} title={`In this stage for ${waited} min`}>
                        {waited} min
                    </span>
                </div>
                <p className="ticket-items">{itemsSummary(order.items)}</p>
                <div className="ticket-meta">
                    <span>
                        <Avatar name={order.customer.name} size={22} /> {order.customer.name}
                    </span>
                    <span className="num">{formatPrice(order.total)}</span>
                </div>
                {order.note && (
                    <p className="ticket-note">
                        <StickyNote size={13} /> {order.note}
                    </p>
                )}
            </button>
            {next && (
                <button
                    type="button"
                    className="btn btn-dark btn-sm btn-block ticket-action"
                    onClick={() => onAdvance(order, next)}
                    disabled={readOnly || Boolean(busy)}
                    title={readOnly ? "Read-only demo" : undefined}
                >
                    {busy === `${order.id}:${next}` ? <span className="spinner" /> : null}
                    {ACTION_LABEL[next]} <ArrowRight size={15} />
                </button>
            )}
        </article>
    );
};

const OrderDrawer = ({ order, onClose, onUpdated, readOnly }) => {
    const { update, busy } = useOrderUpdate(onUpdated);
    const { settings } = useStore();
    const [confirmCancel, setConfirmCancel] = useState(false);
    const next = order ? nextStatus(order.status) : null;
    const canCancel = order && ["placed", "preparing", "out_for_delivery"].includes(order.status);

    return (
        <>
            <Drawer
                open={Boolean(order)}
                onClose={onClose}
                title={order ? `Order ${orderCode(order.number)}` : ""}
                footer={
                    order &&
                    (next || canCancel) && (
                        <>
                            {canCancel && (
                                <button type="button" className="btn btn-ghost" onClick={() => setConfirmCancel(true)} disabled={readOnly || Boolean(busy)}>
                                    <XCircle size={16} /> Cancel
                                </button>
                            )}
                            {next && (
                                <button type="button" className="btn btn-primary" onClick={() => update(order, next)} disabled={readOnly || Boolean(busy)} title={readOnly ? "Read-only demo" : undefined}>
                                    {busy === `${order.id}:${next}` && <span className="spinner" />}
                                    {ACTION_LABEL[next]}
                                </button>
                            )}
                        </>
                    )
                }
            >
                {order && (
                    <div className="order-drawer">
                        <div className="order-drawer-head">
                            <StatusPill status={order.status} />
                            <span className="subtle">{formatDateTime(order.createdAt)}</span>
                        </div>
                        {order.status === "out_for_delivery" && (
                            <section>
                                <h3>Live delivery</h3>
                                <DeliveryMap order={order} etaMinutes={settings?.etaMinutes} compact />
                            </section>
                        )}
                        <section>
                            <h3>Customer</h3>
                            <div className="drawer-customer">
                                <Avatar name={order.customer.name} size={40} />
                                <div>
                                    <strong>{order.customer.name}</strong>
                                    <span className="subtle">{order.customer.email}</span>
                                </div>
                                {!order.address.phone.includes("•") && (
                                    <a href={`tel:${order.address.phone.replace(/\s/g, "")}`} className="btn btn-soft btn-sm">
                                        <Phone size={15} /> Call
                                    </a>
                                )}
                            </div>
                            <AddressBlock address={order.address} />
                            {order.note && (
                                <p className="order-note">
                                    <StickyNote size={15} /> {order.note}
                                </p>
                            )}
                        </section>
                        <section>
                            <h3>Items</h3>
                            <OrderItems items={order.items} />
                            <BillSummary subtotal={order.subtotal} deliveryFee={order.deliveryFee} total={order.total} />
                            <p className={`drawer-pay ${order.paid ? "paid" : ""}`}>
                                {order.paymentMethod === "card" ? <CreditCard size={16} /> : <Banknote size={16} />}
                                {order.paymentMethod === "card" ? "Card" : "Cash on delivery"} ·{" "}
                                {order.paid ? (
                                    <>
                                        <CircleCheck size={15} /> Paid
                                    </>
                                ) : order.status === "cancelled" ? (
                                    "Not charged"
                                ) : (
                                    `Collect ${formatPrice(order.total)}`
                                )}
                            </p>
                        </section>
                        <section>
                            <h3>Timeline</h3>
                            <OrderTimeline order={order} compact />
                        </section>
                    </div>
                )}
            </Drawer>
            <Modal
                open={confirmCancel}
                onClose={() => setConfirmCancel(false)}
                size="sm"
                title="Cancel this order?"
                footer={
                    <>
                        <button type="button" className="btn btn-ghost" onClick={() => setConfirmCancel(false)}>
                            Keep order
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            disabled={Boolean(busy)}
                            onClick={async () => {
                                if (await update(order, "cancelled")) setConfirmCancel(false);
                            }}
                        >
                            {busy && <span className="spinner" />} Cancel order
                        </button>
                    </>
                }
            >
                <p className="muted">
                    {order && `${orderCode(order.number)} for ${order.customer.name} (${formatPrice(order.total)}) will be cancelled and the customer will see it straight away.`}
                </p>
            </Modal>
        </>
    );
};

const Board = ({ now, onOpen }) => {
    const { active, freshIds, markSeen } = useAdminData();
    const { isDemoAdmin } = useAuth();
    const { update, busy } = useOrderUpdate();

    if (!active) {
        return (
            <div className="board">
                {COLUMNS.map((c) => (
                    <div key={c.status} className="board-col">
                        <div className="skeleton" style={{ height: 24, width: 120 }} />
                        <div className="skeleton" style={{ height: 150, borderRadius: 18 }} />
                        <div className="skeleton" style={{ height: 150, borderRadius: 18 }} />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="board">
            {COLUMNS.map((c) => {
                const orders = active.filter((o) => o.status === c.status).sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
                return (
                    <section key={c.status} className={`board-col col-${c.status}`} aria-label={c.title}>
                        <header className="board-col-head">
                            <span className="board-col-icon">
                                <c.icon size={16} />
                            </span>
                            <div>
                                <h2>{c.title}</h2>
                                <span className="subtle">{c.hint}</span>
                            </div>
                            <span className="board-count num">{orders.length}</span>
                        </header>
                        <div className="board-list">
                            {orders.map((o) => (
                                <Ticket
                                    key={o.id}
                                    order={o}
                                    column={c}
                                    now={now}
                                    fresh={freshIds.has(o.id)}
                                    onOpen={(order) => {
                                        markSeen(order.id);
                                        onOpen(order);
                                    }}
                                    onAdvance={(order, status) => {
                                        markSeen(order.id);
                                        update(order, status);
                                    }}
                                    busy={busy}
                                    readOnly={isDemoAdmin}
                                />
                            ))}
                            {!orders.length && <p className="board-empty">Nothing here</p>}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};

const History = ({ now, onOpen, refreshKey }) => {
    const [filter, setFilter] = useState("all");
    const [query, setQuery] = useState("");
    const q = useDeferredValue(query.trim());
    const [result, setResult] = useState(null); // { key, orders }
    const key = `${filter}|${q}|${refreshKey}`;

    useEffect(() => {
        const ctrl = new AbortController();
        api(`/admin/orders?status=${filter}&q=${encodeURIComponent(q)}&limit=150`, { signal: ctrl.signal })
            .then(({ orders }) => setResult({ key: `${filter}|${q}|${refreshKey}`, orders }))
            .catch((err) => err.name !== "AbortError" && toast.error(err.message));
        return () => ctrl.abort();
    }, [filter, q, refreshKey]);

    const loading = !result || result.key !== key;
    const orders = result?.orders ?? [];

    return (
        <>
            <div className="admin-toolbar">
                <div className="input-wrap admin-search">
                    <Search size={17} />
                    <input className="input" type="search" placeholder="Search by order number, name or email" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search orders" />
                </div>
                <div className="segmented" role="group" aria-label="Filter by status">
                    {HISTORY_FILTERS.map((f) => (
                        <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className={`card table-card ${loading && result ? "is-refreshing" : ""}`}>
                {!result ? (
                    <div style={{ padding: 16, display: "grid", gap: 10 }}>
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className="skeleton" style={{ height: 44 }} />
                        ))}
                    </div>
                ) : !orders.length ? (
                    <EmptyState icon={ClipboardList} title="No orders found">
                        {q ? `Nothing matches "${q}".` : "No orders with this status yet."}
                    </EmptyState>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Customer</th>
                                <th className="hide-sm">Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th className="hide-sm">Placed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o) => (
                                <tr key={o.id} onClick={() => onOpen(o)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen(o)}>
                                    <td className="mono strong">{orderCode(o.number)}</td>
                                    <td>
                                        <span className="cell-person">
                                            <Avatar name={o.customer.name} size={28} />
                                            {o.customer.name}
                                        </span>
                                    </td>
                                    <td className="hide-sm cell-items">{itemsSummary(o.items)}</td>
                                    <td className="num strong">{formatPrice(o.total)}</td>
                                    <td>
                                        <StatusPill status={o.status} short />
                                    </td>
                                    <td className="hide-sm subtle" title={formatDateTime(o.createdAt)}>
                                        {timeAgo(o.createdAt, now)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {result && orders.length > 0 && <p className="subtle table-foot">{plural(orders.length, "order")}{orders.length >= 150 ? " (latest 150)" : ""}</p>}
        </>
    );
};

const AdminOrders = () => {
    const { isDemoAdmin } = useAuth();
    const { active } = useAdminData();
    const [params, setParams] = useSearchParams();
    const view = params.get("view") === "history" ? "history" : "board";
    const openId = params.get("open");
    const [opened, setOpened] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const now = useNow(30000);

    // Deep link (?open=id): use the live copy if we have it, otherwise fetch it
    const liveCopy = openId ? active?.find((o) => o.id === openId) : null;
    const drawerOrder = openId ? (liveCopy ?? (opened?.id === openId ? opened : null)) : null;
    useEffect(() => {
        if (!openId || liveCopy || opened?.id === openId) return;
        api(`/orders/${openId}`)
            .then(({ order }) => setOpened(order))
            .catch((err) => toast.error(err.message));
    }, [openId, liveCopy, opened]);

    const setParam = (key, value) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value);
        else next.delete(key);
        setParams(next, { replace: key === "open" ? false : true });
    };

    const open = (order) => {
        setOpened(order);
        setParam("open", order.id);
    };

    return (
        <div className="admin-page">
            <div className="page-head">
                <div>
                    <span className="eyebrow">Orders</span>
                    <h1>{view === "board" ? "Kitchen board" : "Order history"}</h1>
                    <p>{view === "board" ? "New orders appear here automatically, with a chime." : "Every order, newest first. Click one for details."}</p>
                </div>
                <div className="segmented" role="tablist" aria-label="View">
                    <button type="button" role="tab" aria-selected={view === "board"} onClick={() => setParam("view", null)}>
                        Live board {active && active.length > 0 && <span className="seg-count num">{active.length}</span>}
                    </button>
                    <button type="button" role="tab" aria-selected={view === "history"} onClick={() => setParam("view", "history")}>
                        History
                    </button>
                </div>
            </div>

            {view === "board" ? <Board now={now} onOpen={open} /> : <History now={now} onOpen={open} refreshKey={refreshKey} />}

            <OrderDrawer
                order={drawerOrder}
                readOnly={isDemoAdmin}
                onClose={() => setParam("open", null)}
                onUpdated={(o) => {
                    setOpened(o);
                    setRefreshKey((k) => k + 1);
                }}
            />
        </div>
    );
};

export default AdminOrders;
