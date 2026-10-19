import { Router } from "express";
import { sql } from "../db.js";
import { cleanInt } from "../lib/http.js";
import { requireAdmin } from "../lib/auth.js";
import { getStripe, readSettings, toSettings } from "../lib/store.js";

const router = Router();

// Public: the storefront needs these to show fees, ETA and the open/closed state
router.get("/", async (_req, res) => {
    res.json({ settings: await readSettings(), payments: { card: Boolean(getStripe()) } });
});

router.patch("/", requireAdmin, async (req, res) => {
    const current = await readSettings();
    const b = req.body;
    const next = {
        storeOpen: b.storeOpen !== undefined ? Boolean(b.storeOpen) : current.storeOpen,
        deliveryFee: b.deliveryFee !== undefined ? cleanInt(b.deliveryFee, { field: "Delivery fee", max: 500 }) : current.deliveryFee,
        freeDeliveryOver: b.freeDeliveryOver !== undefined ? cleanInt(b.freeDeliveryOver, { field: "Free delivery threshold", max: 10000 }) : current.freeDeliveryOver,
        etaMinutes: b.etaMinutes !== undefined ? cleanInt(b.etaMinutes, { field: "Delivery time", min: 10, max: 180 }) : current.etaMinutes,
    };
    const [row] = await sql`
        update settings set store_open = ${next.storeOpen}, delivery_fee = ${next.deliveryFee},
            free_delivery_over = ${next.freeDeliveryOver}, eta_minutes = ${next.etaMinutes}, updated_at = now()
        where id returning *`;
    res.json({ settings: toSettings(row) });
});

export default router;
