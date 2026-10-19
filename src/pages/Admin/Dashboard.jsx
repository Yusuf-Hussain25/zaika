import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Flame, IndianRupee, Minus, Receipt, ShoppingBag, Timer, UsersRound } from "lucide-react";
import { toast } from "sonner";
import RevenueChart from "./RevenueChart";
import { EmptyState, StatusPill } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useAdminData } from "./AdminData";
import { api } from "../../lib/api";
import { formatPrice, orderCode, percentChange, plural, timeAgo } from "../../lib/format";
import { itemsSummary } from "../../lib/orders";
import { optimizedImage } from "../../lib/upload";
import { useNow } from "../../lib/useNow";

const PERIODS = [
    { days: 1, label: "24h" },
    { days: 7, label: "7 days" },
    { days: 30, label: "30 days" },
];

const greeting = (now) => {
    const h = Number(new Date(now).toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
    if (h < 4 || h >= 17) return "Good evening";
    return h < 12 ? "Good morning" : "Good afternoon";
};

const Delta = ({ now, before, days }) => {
    const pct = percentChange(now, before);
    if (pct === null) return <span className="kpi-delta flat">No earlier data</span>;
    const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
    return (
        <span className={`kpi-delta ${pct > 0 ? "up" : pct < 0 ? "down" : "flat"}`}>
            <Icon size={14} /> {Math.abs(pct)}% <span>vs previous {days === 1 ? "24h" : `${days} days`}</span>
        </span>
    );
};

const Kpi = ({ icon: Icon, label, value, children }) => (
    <div className="card kpi">
        <span className="kpi-label">
            <span className="kpi-icon">
                <Icon size={16} />
            </span>
            {label}
        </span>
        <strong className="kpi-value num">{value}</strong>
        {children}
    </div>
);

const STATUS_ORDER = ["placed", "preparing", "out_for_delivery", "delivered", "cancelled"];

const Dashboard = () => {
    const { user } = useAuth();
    const { active } = useAdminData();
    const now = useNow(60000);
    const [days, setDays] = useState(7);
    const [stats, setStats] = useState(null);
    const loading = !stats || stats.days !== days;

    useEffect(() => {
        const ctrl = new AbortController();
        api(`/admin/stats?days=${days}`, { signal: ctrl.signal })
            .then(setStats)
            .catch((err) => err.name !== "AbortError" && toast.error(err.message));
        return () => ctrl.abort();
    }, [days]);

    const statusTotal = stats ? STATUS_ORDER.reduce((n, s) => n + (stats.byStatus[s] || 0), 0) : 0;
    const topMax = stats?.topDishes[0]?.quantity || 1;
    const waiting = active?.filter((o) => o.status === "placed").length ?? 0;

    return (
        <div className="admin-page">
            <div className="page-head">
                <div>
                    <span className="eyebrow">Dashboard</span>
                    <h1>
                        {greeting(now)}, {user.name.split(" ")[0]}
                    </h1>
                    <p>
                        {stats ? (
                            <>
                                Today so far: <strong className="num">{formatPrice(stats.revenueToday)}</strong> from {plural(stats.ordersToday, "order")}.
                            </>
                        ) : (
                            "Here's how the kitchen is doing."
                        )}
                    </p>
                </div>
                <div className="segmented" role="group" aria-label="Period">
                    {PERIODS.map((p) => (
                        <button key={p.days} type="button" aria-pressed={days === p.days} onClick={() => setDays(p.days)}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className={`kpi-grid ${loading ? "is-loading" : ""}`}>
                {!stats ? (
                    [0, 1, 2, 3].map((i) => <div key={i} className="card kpi skeleton" style={{ height: 128 }} />)
                ) : (
                    <>
                        <Kpi icon={IndianRupee} label="Revenue" value={formatPrice(stats.revenue)}>
                            <Delta now={stats.revenue} before={stats.revenuePrev} days={stats.days} />
                        </Kpi>
                        <Kpi icon={Receipt} label="Orders" value={stats.orders}>
                            <Delta now={stats.orders} before={stats.ordersPrev} days={stats.days} />
                        </Kpi>
                        <Kpi icon={ShoppingBag} label="Average order" value={formatPrice(stats.avgOrder)}>
                            <Delta now={stats.avgOrder} before={stats.avgOrderPrev} days={stats.days} />
                        </Kpi>
                        <Kpi icon={Timer} label="Active right now" value={active ? active.length : "–"}>
                            <span className={`kpi-delta ${waiting ? "warn" : "flat"}`}>{waiting ? `${waiting} waiting to be accepted` : "Nothing waiting"}</span>
                        </Kpi>
                    </>
                )}
            </div>

            <div className="dash-grid">
                <section className="card panel panel-chart">
                    <header className="panel-head">
                        <div>
                            <h2>Revenue, last 14 days</h2>
                            <p className="subtle">Paid and cash orders, cancelled excluded</p>
                        </div>
                        {stats && (
                            <strong className="panel-figure num">{formatPrice(stats.series.reduce((s, d) => s + d.revenue, 0))}</strong>
                        )}
                    </header>
                    {stats ? <RevenueChart series={stats.series} /> : <div className="skeleton" style={{ height: 230 }} />}
                </section>

                <section className="card panel">
                    <header className="panel-head">
                        <div>
                            <h2>Live orders</h2>
                            <p className="subtle">Refreshes every few seconds</p>
                        </div>
                        <Link to="/admin/orders" className="btn btn-ghost btn-sm">
                            Board <ArrowRight size={15} />
                        </Link>
                    </header>
                    {!active && <div className="skeleton" style={{ height: 200 }} />}
                    {active && !active.length && (
                        <EmptyState icon={ShoppingBag} title="All caught up">
                            No orders in the kitchen right now.
                        </EmptyState>
                    )}
                    {active && active.length > 0 && (
                        <ul className="live-list">
                            {active.slice(0, 6).map((o) => (
                                <li key={o.id}>
                                    <Link to={`/admin/orders?open=${o.id}`}>
                                        <div className="live-list-main">
                                            <strong className="mono">{orderCode(o.number)}</strong>
                                            <span className="live-list-items">{itemsSummary(o.items)}</span>
                                        </div>
                                        <div className="live-list-side">
                                            <StatusPill status={o.status} short />
                                            <span className="subtle">{timeAgo(o.createdAt, now)}</span>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="card panel">
                    <header className="panel-head">
                        <div>
                            <h2>Top dishes</h2>
                            <p className="subtle">Units sold, {PERIODS.find((p) => p.days === days)?.label.replace("24h", "last 24 hours") ?? `${days} days`}</p>
                        </div>
                        <Flame size={18} className="panel-icon" />
                    </header>
                    {!stats && <div className="skeleton" style={{ height: 220 }} />}
                    {stats && !stats.topDishes.length && <p className="muted">No sales in this period yet.</p>}
                    {stats && stats.topDishes.length > 0 && (
                        <ol className="top-dishes">
                            {stats.topDishes.map((d, i) => (
                                <li key={d.foodId ?? d.name}>
                                    <span className="top-rank num">{i + 1}</span>
                                    {d.imageUrl ? <img src={optimizedImage(d.imageUrl, 96)} alt="" /> : <span className="top-ph" />}
                                    <div className="top-info">
                                        <div className="top-line">
                                            <strong>{d.name}</strong>
                                            <span className="num">{d.quantity} sold</span>
                                        </div>
                                        <div className="meter" aria-hidden="true">
                                            <span style={{ width: `${(d.quantity / topMax) * 100}%` }} />
                                        </div>
                                        <span className="subtle num">{formatPrice(d.revenue)} revenue</span>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>

                <section className="card panel">
                    <header className="panel-head">
                        <div>
                            <h2>Orders by status</h2>
                            <p className="subtle">{stats ? `${plural(statusTotal, "order")} in this period` : "Loading…"}</p>
                        </div>
                    </header>
                    {!stats && <div className="skeleton" style={{ height: 200 }} />}
                    {stats && (
                        <ul className="status-bars">
                            {STATUS_ORDER.map((s) => {
                                const n = stats.byStatus[s] || 0;
                                return (
                                    <li key={s}>
                                        <div className="status-bars-line">
                                            <StatusPill status={s} />
                                            <span className="num">
                                                {n} <span className="subtle">· {statusTotal ? Math.round((n / statusTotal) * 100) : 0}%</span>
                                            </span>
                                        </div>
                                        <div className={`meter tone-${s}`} aria-hidden="true">
                                            <span style={{ width: `${statusTotal ? (n / statusTotal) * 100 : 0}%` }} />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {stats && (
                        <p className="subtle panel-foot">
                            <UsersRound size={14} /> {stats.customers} customers · {stats.newCustomers} new in this period
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
