import express from "express";
import authRoutes from "./routes/auth.js";
import foodRoutes from "./routes/foods.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import settingsRoutes from "./routes/settings.js";
import { sql } from "./db.js";
import { dailyCatchUp } from "./lib/autopilot.js";

// Express 5 forwards rejected promises from async handlers to the error handler below.
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "zaika-api" }));
// Wakes the database (Neon pauses after 5 idle minutes). The site calls it quietly on load,
// so the database is awake by the time a visitor logs in or checks out.
app.get("/api/warm", async (_req, res) => {
    await sql`select 1`;
    res.set("Cache-Control", "no-store").json({ ok: true });
});
// Called once a day by Vercel Cron (vercel.json), which sends CRON_SECRET as a bearer token
app.get("/api/cron/daily", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ ok: false });
    res.set("Cache-Control", "no-store").json(await dailyCatchUp());
});
app.use("/api/auth", authRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// Express needs the 4-argument signature to treat this as an error handler
app.use((err, _req, res, _next) => {
    if (/Error connecting to database|fetch failed/.test(err.message)) {
        console.error("database unreachable:", err.cause?.code || err.message);
        return res.status(503).json({ error: "We can't reach the kitchen's database right now. Please try again in a moment." });
    }
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    const message = err.expose || status < 500 ? err.message : "Something went wrong on our side. Please try again.";
    res.status(status).json({ error: message });
});

export default app;
