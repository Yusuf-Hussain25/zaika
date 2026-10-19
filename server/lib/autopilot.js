import { randomUUID } from "node:crypto";
import { sql, transaction } from "../db.js";
import { DEMO_DOMAIN } from "./orders.js";
import { deliveryFeeFor, readSettings } from "./store.js";

// Demo autopilot (DEMO_AUTOPILOT=true): keeps a public demo alive without anyone in the kitchen.
// - Orders from @zaika-demo.dev customers move along the kitchen flow on a timer
// - When the board is quiet, a seeded customer places a new order now and then
// Real customers' orders are never touched. Runs at most every 30s per server instance.

const MINUTE = 60_000;
// An order waits 2 min as placed, 6 min preparing and 8 min on the road (see advance())
const NEXT = { placed: "preparing", preparing: "out_for_delivery", out_for_delivery: "delivered" };
const QUIET_BOARD = 3; // fewer active demo orders than this invites a new one
const NEW_ORDER_EVERY = 4; // minutes between simulated orders

let lastRun = 0;
let running = null;

const demoEmail = `%@${DEMO_DOMAIN}`;

const advance = async () => {
    const due = await sql`
        select o.id, o.status from orders o join users u on u.id = o.user_id
        where u.email like ${demoEmail}
          and (   (o.status = 'placed' and o.updated_at < now() - interval '2 minutes')
               or (o.status = 'preparing' and o.updated_at < now() - interval '6 minutes')
               or (o.status = 'out_for_delivery' and o.updated_at < now() - interval '8 minutes'))
        limit 20`;
    for (const o of due) {
        const next = NEXT[o.status];
        // The status guard turns a concurrent run into a no-op instead of a double step
        const [moved] = await sql`
            update orders set status = ${next}, updated_at = now(),
                paid = paid or (${next} = 'delivered' and payment_method = 'cod')
            where id = ${o.id} and status = ${o.status}
            returning id`;
        if (moved) await sql`insert into order_events (order_id, status) values (${o.id}, ${next})`;
    }
};

const simulateOrder = async () => {
    const settings = await readSettings();
    if (!settings.storeOpen) return;
    const [{ active, last }] = await sql`
        select count(*) filter (where o.status in ('placed', 'preparing', 'out_for_delivery'))::int as active,
               max(o.created_at) as last
        from orders o join users u on u.id = o.user_id
        where u.email like ${demoEmail} and u.role = 'customer'`;
    if (active >= QUIET_BOARD || (last && Date.now() - new Date(last).getTime() < NEW_ORDER_EVERY * MINUTE)) return;

    // A seeded regular (not the public demo login) orders from their saved address
    const [customer] = await sql`
        select id, address from users
        where email like ${demoEmail} and role = 'customer' and address is not null
          and email not in (${process.env.VITE_DEMO_EMAIL || ""})
        order by random() limit 1`;
    if (!customer) return;
    const foods = await sql`select * from foods where is_available order by random() limit ${1 + Math.floor(Math.random() * 3)}`;
    if (!foods.length) return;
    const qty = foods.map(() => 1 + Math.floor(Math.random() * 2));
    const subtotal = foods.reduce((s, f, i) => s + f.price * qty[i], 0);
    const deliveryFee = deliveryFeeFor(subtotal, settings);
    const id = randomUUID();
    await transaction((tx) => [
        tx`insert into orders (id, user_id, status, payment_method, subtotal, delivery_fee, total, address)
           values (${id}, ${customer.id}, 'placed', 'cod', ${subtotal}, ${deliveryFee}, ${subtotal + deliveryFee}, ${JSON.stringify(customer.address)}::jsonb)`,
        tx`insert into order_items (order_id, food_id, name, price, quantity, image_url, is_veg)
           select ${id}, * from unnest(${foods.map((f) => f.id)}::uuid[], ${foods.map((f) => f.name)}::text[], ${foods.map((f) => f.price)}::int[],
                                       ${qty}::int[], ${foods.map((f) => f.image_url)}::text[], ${foods.map((f) => f.is_veg)}::boolean[])`,
        tx`insert into order_events (order_id, status) values (${id}, 'placed')`,
    ]);
};

export const autopilot = async () => {
    if (process.env.DEMO_AUTOPILOT !== "true") return;
    if (running) return running;
    if (Date.now() - lastRun < 30_000) return;
    lastRun = Date.now();
    running = (async () => {
        try {
            await advance();
            await simulateOrder();
        } catch (err) {
            console.error("autopilot:", err.message);
        } finally {
            running = null;
        }
    })();
    return running;
};

// Express middleware: catch the demo up before reading orders
export const withAutopilot = async (_req, _res, next) => {
    await autopilot();
    next();
};
