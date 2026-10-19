import Stripe from "stripe";
import { sql } from "../db.js";

export const toSettings = (s) => ({
    storeOpen: s.store_open,
    deliveryFee: s.delivery_fee,
    freeDeliveryOver: s.free_delivery_over,
    etaMinutes: s.eta_minutes,
    updatedAt: s.updated_at,
});

export const readSettings = async () => {
    const [row] = await sql`select * from settings where id`;
    return toSettings(row);
};

export const deliveryFeeFor = (subtotal, settings) =>
    subtotal === 0 || subtotal >= settings.freeDeliveryOver ? 0 : settings.deliveryFee;

let stripe;
// Card payments are offered only when a Stripe secret key is configured
export const getStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || !key.startsWith("sk_")) return null;
    stripe ??= new Stripe(key);
    return stripe;
};

export const CURRENCY = "inr";
