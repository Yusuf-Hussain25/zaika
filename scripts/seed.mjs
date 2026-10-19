// npm run seed [-- --with you@example.com]
//
// Fills Zaika with realistic demo data: the menu, demo accounts, customers and two weeks of
// orders in every status. Everything goes through the real API (same validation, prices and
// permissions as the app); SQL is used only to grant the seeded admin roles and to backdate
// timestamps. Safe to re-run: existing accounts and dishes are reused, orders are only topped up.
import dotenv from "dotenv";
import { DISHES } from "./seed-data.mjs";

dotenv.config({ quiet: true });

const DOMAIN = "zaika-demo.dev";
const env = process.env;
const fail = (msg) => {
    console.error(`\n✖ ${msg}\n`);
    process.exit(1);
};

for (const key of ["DATABASE_URL", "JWT_SECRET", "VITE_DEMO_EMAIL", "VITE_DEMO_PASSWORD", "VITE_DEMO_ADMIN_EMAIL", "VITE_DEMO_ADMIN_PASSWORD", "SEED_PASSWORD"]) {
    if (!env[key]) fail(`${key} is missing from .env (see .env.example).`);
}
for (const key of ["VITE_DEMO_EMAIL", "VITE_DEMO_ADMIN_EMAIL"]) {
    if (!env[key].endsWith(`@${DOMAIN}`)) fail(`${key} must end with @${DOMAIN} so demo data stays clearly separate.`);
}

const withIndex = process.argv.indexOf("--with");
const withEmail = withIndex > -1 ? process.argv[withIndex + 1]?.toLowerCase() : null;
if (withIndex > -1 && !withEmail) fail("Usage: npm run seed -- --with you@example.com");

const { migrate } = await import("../server/migrate.js");
const { sql } = await import("../server/db.js");
const { signToken } = await import("../server/lib/auth.js");
const { default: app } = await import("../server/app.js");

await migrate({ log: (m) => console.log(`• ${m}`) });

// Run the real API in-process on a free port
const server = app.listen(0);
await new Promise((r) => server.once("listening", r));
const BASE = `http://127.0.0.1:${server.address().port}/api`;

const call = async (path, { token, method = "GET", body } = {}) => {
    const res = await fetch(BASE + path, {
        method,
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(`${method} ${path}: ${data.error || res.status}`);
        err.status = res.status;
        throw err;
    }
    return data;
};

// Deterministic randomness, so re-runs and screenshots look the same
let seed = 20261019;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (a, b) => a + Math.floor(rand() * (b - a + 1));

const ensureAccount = async ({ name, email, password }) => {
    try {
        return await call("/auth/login", { method: "POST", body: { email, password } });
    } catch (err) {
        if (err.status !== 401) throw err;
    }
    try {
        return await call("/auth/register", { method: "POST", body: { name, email, password } });
    } catch (err) {
        if (err.status === 409) fail(`${email} exists with a different password. Update .env or delete that user.`);
        throw err;
    }
};

const CITIES = [
    { city: "Bengaluru", pincode: "560038", streets: ["12th Main, Indiranagar", "80 Feet Rd, Koramangala 4th Block", "CMH Road, Indiranagar"] },
    { city: "Mumbai", pincode: "400050", streets: ["Hill Road, Bandra West", "Carter Road, Bandra", "Linking Road, Khar West"] },
    { city: "Hyderabad", pincode: "500034", streets: ["Road No. 12, Banjara Hills", "Jubilee Hills Check Post Rd", "Film Nagar Main Rd"] },
    { city: "New Delhi", pincode: "110017", streets: ["Malviya Nagar Main Rd", "Saket District Centre", "Hauz Khas Village"] },
    { city: "Pune", pincode: "411001", streets: ["North Main Road, Koregaon Park", "MG Road, Camp", "Lane 6, Koregaon Park"] },
];

const CUSTOMERS = [
    "Aarav Sharma", "Ananya Iyer", "Rohan Mehta", "Priya Nair", "Kabir Singh", "Meera Reddy",
    "Arjun Kapoor", "Isha Banerjee", "Vikram Rao", "Sneha Kulkarni", "Aditya Joshi", "Zoya Khan",
];

const slug = (name) => name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
const addressFor = (name, i) => {
    const c = CITIES[i % CITIES.length];
    return {
        name,
        phone: `+91 9${String(800000000 + i * 7919137).slice(0, 4)} ${String(10000 + i * 3371).slice(0, 5)}`,
        line1: `Flat ${between(101, 1204)}, ${pick(c.streets)}`,
        landmark: i % 3 === 0 ? "Near the metro station" : null,
        city: c.city,
        pincode: c.pincode,
    };
};

// ------------------------------------------------------------------ accounts
console.log("• accounts");
const admin = await ensureAccount({ name: "Zaika Kitchen", email: `admin@${DOMAIN}`, password: env.SEED_PASSWORD });
const viewer = await ensureAccount({ name: "Demo Admin", email: env.VITE_DEMO_ADMIN_EMAIL, password: env.VITE_DEMO_ADMIN_PASSWORD });
// Roles can't be granted through the API (by design), so the seeder bootstraps them
await sql`update users set role = 'admin' where id = ${admin.user.id}`;
await sql`update users set role = 'demo_admin' where id = ${viewer.user.id}`;

const demo = await ensureAccount({ name: "Riya Desai", email: env.VITE_DEMO_EMAIL, password: env.VITE_DEMO_PASSWORD });
const people = [{ ...demo, address: addressFor("Riya Desai", 0), demo: true }];
for (const [i, name] of CUSTOMERS.entries()) {
    const acc = await ensureAccount({ name, email: `${slug(name)}@${DOMAIN}`, password: env.SEED_PASSWORD });
    people.push({ ...acc, address: addressFor(name, i + 1) });
}

if (withEmail) {
    const [u] = await sql`select * from users where email = ${withEmail}`;
    if (!u) fail(`No account for ${withEmail}. Sign up in the app first.`);
    // The seeder signs a session for that account so its orders go through the API too
    people.push({ token: signToken(u), user: u, address: u.address || addressFor(u.name, 99), with: true });
}

// ------------------------------------------------------------------ menu
console.log("• menu");
const existing = new Map((await call("/foods")).foods.map((f) => [f.name.toLowerCase(), f]));
let added = 0;
for (const d of DISHES) {
    if (existing.has(d.name.toLowerCase())) continue;
    const { food } = await call("/foods", { token: admin.token, method: "POST", body: { ...d, imageUrl: `/dishes/${d.image}.webp` } });
    existing.set(food.name.toLowerCase(), food);
    added++;
}
const menu = [...existing.values()];
const available = menu.filter((f) => f.isAvailable);
console.log(`  ${added} dishes added, ${menu.length} on the menu`);

// ------------------------------------------------------------------ orders
const settings = (await call("/settings")).settings;
if (!settings.storeOpen) await call("/settings", { token: admin.token, method: "PATCH", body: { storeOpen: true } });

const IST = 5.5 * 3600 * 1000;
// A realistic order time `daysAgo` days back: lunch or dinner rush in India, never in the future
const orderTime = (daysAgo) => {
    const now = Date.now();
    const istMidnight = Math.floor((now + IST) / 86400000) * 86400000 - IST;
    const day = istMidnight - daysAgo * 86400000;
    const lunch = rand() < 0.42;
    const minutes = lunch ? between(12 * 60, 15 * 60) : between(19 * 60, 22 * 60 + 45);
    let t = day + minutes * 60000;
    if (t > now - 3 * 60000) t = now - between(4, 50) * 60000;
    return new Date(t);
};

const placeOrder = async (person, daysAgo) => {
    const lines = Array.from({ length: between(1, 4) }, () => pick(available));
    for (const food of new Set(lines)) {
        await call(`/cart/${food.id}`, { token: person.token, method: "PUT", body: { quantity: lines.filter((l) => l === food).length + (rand() < 0.2 ? 1 : 0) } });
    }
    const { order } = await call("/orders", { token: person.token, method: "POST", body: { address: person.address, paymentMethod: "cod" } });
    return { order, at: orderTime(daysAgo) };
};

// Where an order of this age should be in the kitchen flow
const targetStatus = (at) => {
    const mins = (Date.now() - at.getTime()) / 60000;
    if (rand() < 0.07) return "cancelled";
    if (mins < 12) return "placed";
    if (mins < 30) return "preparing";
    if (mins < 55) return "out_for_delivery";
    return "delivered";
};

const advance = async (order, status) => {
    const flow = ["preparing", "out_for_delivery", "delivered"];
    if (status === "cancelled") return call(`/admin/orders/${order.id}`, { token: admin.token, method: "PATCH", body: { status } });
    for (const s of flow.slice(0, flow.indexOf(status) + 1)) {
        await call(`/admin/orders/${order.id}`, { token: admin.token, method: "PATCH", body: { status: s } });
    }
};

// Spread status events after the order time like a real kitchen
const backdate = async (orderId, at) => {
    const events = await sql`select id, status from order_events where order_id = ${orderId} order by id`;
    let t = at.getTime();
    const gaps = { placed: 0, preparing: between(3, 8), out_for_delivery: between(14, 24), delivered: between(12, 22), cancelled: between(2, 9) };
    for (const e of events) {
        t += (gaps[e.status] ?? 5) * 60000;
        if (t > Date.now()) t = Date.now() - 60000;
        await sql`update order_events set created_at = ${new Date(t)} where id = ${e.id}`;
    }
    await sql`update orders set created_at = ${at}, updated_at = ${new Date(t)} where id = ${orderId}`;
};

const [{ count: seededOrders }] = await sql`
    select count(*)::int as count from orders o join users u on u.id = o.user_id where u.email like ${"%@" + DOMAIN}`;
const TARGET = 72;
const plan = [];
if (seededOrders < TARGET) {
    // Busier on recent days and weekends; the demo account always has something in flight today
    for (let i = seededOrders; i < TARGET; i++) {
        const daysAgo = Math.min(13, Math.floor(Math.pow(rand(), 1.4) * 14));
        plan.push({ person: pick(people.filter((p) => !p.demo && !p.with)), daysAgo });
    }
    const demoPerson = people[0];
    if (seededOrders === 0) {
        plan.push({ person: demoPerson, daysAgo: 0, force: "out_for_delivery", minsAgo: 34 });
        plan.push({ person: demoPerson, daysAgo: 0, force: "placed", minsAgo: 6 });
        for (const d of [1, 3, 6, 9]) plan.push({ person: demoPerson, daysAgo: d });
        // A few live tickets for the kitchen board
        plan.push({ person: people[2], daysAgo: 0, force: "placed", minsAgo: 3 });
        plan.push({ person: people[5], daysAgo: 0, force: "preparing", minsAgo: 16 });
        plan.push({ person: people[7], daysAgo: 0, force: "preparing", minsAgo: 21 });
        plan.push({ person: people[9], daysAgo: 0, force: "out_for_delivery", minsAgo: 41 });
    }
}
if (withEmail) {
    const mine = people.find((p) => p.with);
    plan.push({ person: mine, daysAgo: 0, force: "preparing", minsAgo: 14 }, { person: mine, daysAgo: 2 }, { person: mine, daysAgo: 5 });
}

console.log(`• orders: ${seededOrders} exist, placing ${plan.length}`);
// Different customers can order in parallel; each customer's own steps stay in sequence
const byPerson = new Map();
for (const p of plan) byPerson.set(p.person, [...(byPerson.get(p.person) || []), p]);
let done = 0;
await Promise.all(
    [...byPerson.values()].map(async (jobs) => {
        for (const job of jobs) {
            const { order, at: rawAt } = await placeOrder(job.person, job.daysAgo);
            const at = job.minsAgo ? new Date(Date.now() - job.minsAgo * 60000) : rawAt;
            const status = job.force ?? targetStatus(at);
            if (status !== "placed") await advance(order, status);
            await backdate(order.id, at);
            done++;
            if (done % 10 === 0) console.log(`  ${done}/${plan.length}`);
        }
    }),
);

// Leave something in the demo cart, like a real returning customer
const demoCart = (await call("/cart", { token: demo.token })).items;
if (!Object.keys(demoCart).length) {
    const treats = available.filter((f) => ["desserts", "drinks"].includes(f.category)).slice(0, 2);
    for (const f of treats) await call(`/cart/${f.id}`, { token: demo.token, method: "PUT", body: { quantity: 1 } });
}

if (!settings.storeOpen) await call("/settings", { token: admin.token, method: "PATCH", body: { storeOpen: false } });
server.close();

const [{ orders, revenue }] = await sql`select count(*)::int as orders, coalesce(sum(total), 0)::int as revenue from orders where status <> 'cancelled'`;
console.log(`\n✔ Seeded. ${menu.length} dishes, ${people.length} customers, ${orders} orders (₹${revenue.toLocaleString("en-IN")} revenue).`);
console.log(`  Demo customer:  ${env.VITE_DEMO_EMAIL}`);
console.log(`  Demo admin:     ${env.VITE_DEMO_ADMIN_EMAIL} (read-only)`);
console.log(`  Admin:          admin@${DOMAIN} (password = SEED_PASSWORD)\n`);
process.exit(0);
