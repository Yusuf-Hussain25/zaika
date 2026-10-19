import express from "express";
import authRoutes from "./routes/auth.js";
import foodRoutes from "./routes/foods.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import settingsRoutes from "./routes/settings.js";

// Express 5 forwards rejected promises from async handlers to the error handler below.
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "zaika-api" }));
app.use("/api/auth", authRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line no-unused-vars -- Express needs the 4-argument signature to treat this as an error handler
app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    const message = err.expose || status < 500 ? err.message : "Something went wrong on our side. Please try again.";
    res.status(status).json({ error: message });
});

export default app;
