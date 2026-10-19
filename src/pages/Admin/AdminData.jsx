import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { formatPrice, orderCode } from "../../lib/format";

const AdminDataContext = createContext(null);
const POLL_MS = 12000;

// A short two-note chime for new orders. Browsers only allow it after the user has interacted.
const chime = () => {
    try {
        const ctx = new AudioContext();
        [880, 1320].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.14);
            gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + i * 0.14 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.14 + 0.35);
            osc.connect(gain).connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.14);
            osc.stop(ctx.currentTime + i * 0.14 + 0.4);
        });
        setTimeout(() => ctx.close(), 1000);
    } catch {
        // no audio available: the toast still shows
    }
};

// Live feed of active orders shared by the sidebar badge, dashboard and board
export const AdminDataProvider = ({ children }) => {
    const [active, setActive] = useState(null);
    const [freshIds, setFreshIds] = useState(() => new Set());
    const seen = useRef(null);

    const apply = useCallback((orders) => {
        const ids = new Set(orders.map((o) => o.id));
        if (seen.current) {
            const incoming = orders.filter((o) => !seen.current.has(o.id) && o.status === "placed");
            if (incoming.length) {
                chime();
                for (const o of incoming) {
                    toast.success(`New order ${orderCode(o.number)}`, { description: `${o.customer.name} · ${formatPrice(o.total)}` });
                }
                setFreshIds((prev) => new Set([...prev, ...incoming.map((o) => o.id)]));
            }
        }
        seen.current = ids;
        setActive(orders);
    }, []);

    const refresh = useCallback(() => api("/admin/orders?status=active").then(({ orders }) => apply(orders)), [apply]);

    useEffect(() => {
        api("/admin/orders?status=active")
            .then(({ orders }) => apply(orders))
            .catch((err) => toast.error(err.message));
        const timer = setInterval(() => {
            if (document.visibilityState === "visible") refresh().catch(() => {});
        }, POLL_MS);
        return () => clearInterval(timer);
    }, [apply, refresh]);

    // Apply an order the admin just changed without waiting for the next poll
    const upsert = useCallback((order) => {
        setActive((list) => {
            if (!list) return list;
            const stillActive = ["placed", "preparing", "out_for_delivery"].includes(order.status);
            const rest = list.filter((o) => o.id !== order.id);
            return stillActive ? [order, ...rest].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : rest;
        });
    }, []);

    const markSeen = useCallback((id) => {
        setFreshIds((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, []);

    const value = useMemo(() => ({ active, refresh, upsert, freshIds, markSeen }), [active, refresh, upsert, freshIds, markSeen]);
    return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- hook lives next to its provider
export const useAdminData = () => useContext(AdminDataContext);
