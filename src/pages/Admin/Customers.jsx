import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Crown, Repeat, Search, UsersRound, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Avatar, EmptyState } from "../../components/ui";
import { api } from "../../lib/api";
import { formatDate, formatPrice, plural, timeAgo } from "../../lib/format";
import { useNow } from "../../lib/useNow";

const Customers = () => {
    const [query, setQuery] = useState("");
    const q = useDeferredValue(query.trim());
    const [result, setResult] = useState(null); // { q, customers }
    const now = useNow(60000);

    useEffect(() => {
        const ctrl = new AbortController();
        api(`/admin/customers?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
            .then(({ customers }) => setResult({ q, customers }))
            .catch((err) => err.name !== "AbortError" && toast.error(err.message));
        return () => ctrl.abort();
    }, [q]);

    const customers = useMemo(() => result?.customers ?? [], [result]);
    const summary = useMemo(() => {
        const buyers = customers.filter((c) => c.orders > 0);
        const spent = buyers.reduce((s, c) => s + c.spent, 0);
        return {
            total: customers.length,
            repeat: customers.filter((c) => c.orders >= 2).length,
            avgSpend: buyers.length ? Math.round(spent / buyers.length) : 0,
            top: customers[0],
        };
    }, [customers]);

    return (
        <div className="admin-page">
            <div className="page-head">
                <div>
                    <span className="eyebrow">Customers</span>
                    <h1>Your regulars</h1>
                    <p>Everyone who has signed up, ranked by lifetime spend.</p>
                </div>
            </div>

            {!q && result && (
                <div className="kpi-grid">
                    <div className="card kpi">
                        <span className="kpi-label">
                            <span className="kpi-icon"><UsersRound size={16} /></span> Customers
                        </span>
                        <strong className="kpi-value num">{summary.total}</strong>
                    </div>
                    <div className="card kpi">
                        <span className="kpi-label">
                            <span className="kpi-icon"><Repeat size={16} /></span> Ordered twice or more
                        </span>
                        <strong className="kpi-value num">{summary.repeat}</strong>
                        <span className="kpi-delta flat">{summary.total ? Math.round((summary.repeat / summary.total) * 100) : 0}% of customers</span>
                    </div>
                    <div className="card kpi">
                        <span className="kpi-label">
                            <span className="kpi-icon"><Wallet size={16} /></span> Average lifetime spend
                        </span>
                        <strong className="kpi-value num">{formatPrice(summary.avgSpend)}</strong>
                    </div>
                    <div className="card kpi">
                        <span className="kpi-label">
                            <span className="kpi-icon"><Crown size={16} /></span> Top customer
                        </span>
                        <strong className="kpi-value kpi-value-sm">{summary.top?.orders ? summary.top.name : "–"}</strong>
                        {summary.top?.orders > 0 && <span className="kpi-delta flat num">{formatPrice(summary.top.spent)} across {plural(summary.top.orders, "order")}</span>}
                    </div>
                </div>
            )}

            <div className="admin-toolbar">
                <div className="input-wrap admin-search">
                    <Search size={17} />
                    <input className="input" type="search" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search customers" />
                </div>
            </div>

            <div className={`card table-card ${result && result.q !== q ? "is-refreshing" : ""}`}>
                {!result ? (
                    <div style={{ padding: 16, display: "grid", gap: 10 }}>
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className="skeleton" style={{ height: 48 }} />
                        ))}
                    </div>
                ) : !customers.length ? (
                    <EmptyState icon={UsersRound} title={q ? "No customers match" : "No customers yet"}>
                        {q ? `Nobody matches "${q}".` : "Customers appear here after they sign up."}
                    </EmptyState>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Orders</th>
                                <th>Spent</th>
                                <th className="hide-sm">Last order</th>
                                <th className="hide-sm">Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c) => (
                                <tr key={c.id} className="no-click">
                                    <td>
                                        <span className="cell-person">
                                            <Avatar name={c.name} size={34} />
                                            <span className="cell-stack">
                                                <strong>{c.name}</strong>
                                                <span className="subtle">{c.email}</span>
                                            </span>
                                        </span>
                                    </td>
                                    <td className="num">{c.orders}</td>
                                    <td className="num strong">{formatPrice(c.spent)}</td>
                                    <td className="hide-sm subtle">{c.lastOrderAt ? timeAgo(c.lastOrderAt, now) : "Never"}</td>
                                    <td className="hide-sm subtle">{formatDate(c.joinedAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Customers;
