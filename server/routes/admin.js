import { Router } from "express";
import { query, sql, transaction } from "../db.js";
import { badRequest, cleanId, cleanInt, notFound } from "../lib/http.js";
import { requireAdmin, requireStaff } from "../lib/auth.js";
import { DEMO_DOMAIN, fetchOrder, fetchOrders, maskEmail } from "../lib/orders.js";
import { ORDER_FLOW } from "../../shared/menu.js";
import { withAutopilot } from "../lib/autopilot.js";
import { refundOrder } from "../lib/payments.js";

const router = Router();
const TZ = "Asia/Kolkata";
const ACTIVE = ["placed", "preparing", "out_for_delivery"];

// GET /api/admin/orders?status=active|all|<status>&q=&limit=
router.get("/orders", requireStaff, withAutopilot, async (req, res) => {
    const status = String(req.query.status || "all");
    const q = String(req.query.q || "").trim();
    const where = [];
    const params = [];
    if (status === "active") {
        params.push(ACTIVE);
        where.push(`o.status = any($${params.length})`);
    } else if (status === "all") {
        // Unpaid card checkouts are not real orders yet
        where.push(`o.status <> 'awaiting_payment'`);
    } else {
        params.push(status);
        where.push(`o.status = $${params.length}`);
    }
    if (q) {
        params.push(`%${q.replace(/^#?ZK-?/i, "")}%`);
        where.push(`(o.number::text ilike $${params.length} or u.name ilike $${params.length} or u.email ilike $${params.length})`);
    }
    const orders = await fetchOrders({ where: where.join(" and "), params, limit: req.query.limit || 200, viewer: req.user });
    res.json({ orders });
});

// Moves an order through the kitchen flow, or cancels it
router.patch("/orders/:id", requireAdmin, async (req, res) => {
    const id = cleanId(req.params.id, "Order");
    const status = String(req.body.status || "");
    if (![...ORDER_FLOW, "cancelled"].includes(status)) throw badRequest("Unknown order status.");
    const [order] = await sql`select * from orders where id = ${id}`;
    if (!order) throw notFound("Order not found.");
    if (["delivered", "cancelled"].includes(order.status)) throw badRequest(`This order is already ${order.status}.`);
    if (order.status === "awaiting_payment") throw badRequest("This order hasn't been paid yet.");
    if (order.status === status) return res.json({ order: await fetchOrder(id, req.user) });
    if (status !== "cancelled" && ORDER_FLOW.indexOf(status) < ORDER_FLOW.indexOf(order.status)) {
        throw badRequest("Orders can only move forward.");
    }
    // Cancelling a paid online order refunds it first; if the provider refuses, the order stays as it was
    if (status === "cancelled") await refundOrder(order);
    await transaction((tx) => [
        // Cash is collected at the door, so a delivered COD order is now paid
        tx`update orders set status = ${status}, updated_at = now(),
              paid = paid or (${status} = 'delivered' and payment_method = 'cod')
           where id = ${id}`,
        tx`insert into order_events (order_id, status) values (${id}, ${status})`,
    ]);
    res.json({ order: await fetchOrder(id, req.user) });
});

// Dashboard numbers for the last `days` days, compared with the period before
router.get("/stats", requireStaff, withAutopilot, async (req, res) => {
    const days = cleanInt(req.query.days ?? 7, { field: "Days", min: 1, max: 90 });
    const counted = `status not in ('cancelled', 'awaiting_payment')`;

    const [kpi] = await query(
        `select
            coalesce(sum(total) filter (where ${counted} and created_at >= now() - make_interval(days => $1)), 0)::int as revenue,
            coalesce(sum(total) filter (where ${counted} and created_at >= now() - make_interval(days => $1 * 2)
                                              and created_at < now() - make_interval(days => $1)), 0)::int as revenue_prev,
            count(*) filter (where ${counted} and created_at >= now() - make_interval(days => $1))::int as orders,
            count(*) filter (where ${counted} and created_at >= now() - make_interval(days => $1 * 2)
                                    and created_at < now() - make_interval(days => $1))::int as orders_prev,
            count(*) filter (where status = any($2))::int as active,
            coalesce(sum(total) filter (where ${counted} and (created_at at time zone '${TZ}')::date = (now() at time zone '${TZ}')::date), 0)::int as revenue_today,
            count(*) filter (where ${counted} and (created_at at time zone '${TZ}')::date = (now() at time zone '${TZ}')::date)::int as orders_today
         from orders`,
        [days, ACTIVE],
    );

    const series = await query(
        `select to_char(d, 'YYYY-MM-DD') as day,
                coalesce(sum(o.total) filter (where o.status not in ('cancelled', 'awaiting_payment')), 0)::int as revenue,
                count(o.id) filter (where o.status not in ('cancelled', 'awaiting_payment'))::int as orders
         from generate_series((now() at time zone '${TZ}')::date - 13, (now() at time zone '${TZ}')::date, interval '1 day') d
         left join orders o on (o.created_at at time zone '${TZ}')::date = d::date
         group by d order by d`,
    );

    const byStatus = await query(
        `select status, count(*)::int as count from orders
         where created_at >= now() - make_interval(days => $1) and status <> 'awaiting_payment'
         group by status`,
        [days],
    );

    const topDishes = await query(
        `select oi.food_id, max(oi.name) as name, max(oi.image_url) as image_url,
                sum(oi.quantity)::int as quantity, sum(oi.quantity * oi.price)::int as revenue
         from order_items oi join orders o on o.id = oi.order_id
         where o.${counted} and o.created_at >= now() - make_interval(days => $1)
         group by oi.food_id order by quantity desc limit 5`,
        [days],
    );

    const [customers] = await query(
        `select count(*)::int as total,
                count(*) filter (where created_at >= now() - make_interval(days => $1))::int as new
         from users where role = 'customer'`,
        [days],
    );

    res.json({
        days,
        revenue: kpi.revenue,
        revenuePrev: kpi.revenue_prev,
        orders: kpi.orders,
        ordersPrev: kpi.orders_prev,
        avgOrder: kpi.orders ? Math.round(kpi.revenue / kpi.orders) : 0,
        avgOrderPrev: kpi.orders_prev ? Math.round(kpi.revenue_prev / kpi.orders_prev) : 0,
        active: kpi.active,
        revenueToday: kpi.revenue_today,
        ordersToday: kpi.orders_today,
        customers: customers.total,
        newCustomers: customers.new,
        series: series.map((s) => ({ day: s.day, revenue: s.revenue, orders: s.orders })),
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s.count])),
        topDishes: topDishes.map((d) => ({ foodId: d.food_id, name: d.name, imageUrl: d.image_url, quantity: d.quantity, revenue: d.revenue })),
    });
});

router.get("/customers", requireStaff, async (req, res) => {
    const q = String(req.query.q || "").trim();
    const rows = await query(
        `select u.id, u.name, u.email, u.created_at,
                count(o.id) filter (where o.status not in ('cancelled', 'awaiting_payment'))::int as orders,
                coalesce(sum(o.total) filter (where o.status not in ('cancelled', 'awaiting_payment')), 0)::int as spent,
                max(o.created_at) as last_order_at
         from users u left join orders o on o.user_id = u.id
         where u.role = 'customer' and ($1 = '' or u.name ilike '%' || $1 || '%' or u.email ilike '%' || $1 || '%')
         group by u.id
         order by spent desc, u.created_at desc
         limit 500`,
        [q],
    );
    const demo = req.user.role === "demo_admin";
    res.json({
        customers: rows.map((c) => ({
            id: c.id,
            name: c.name,
            email: demo && !c.email.endsWith(`@${DEMO_DOMAIN}`) ? maskEmail(c.email) : c.email,
            joinedAt: c.created_at,
            orders: c.orders,
            spent: c.spent,
            lastOrderAt: c.last_order_at,
        })),
    });
});

export default router;
