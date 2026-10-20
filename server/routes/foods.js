import { Router } from "express";
import { sql } from "../db.js";
import { badRequest, cleanId, cleanInt, cleanText, notFound } from "../lib/http.js";
import { requireAdmin } from "../lib/auth.js";
import { CATEGORY_IDS } from "../../shared/menu.js";

const router = Router();

export const toFood = (f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    price: f.price,
    imageUrl: f.image_url,
    category: f.category,
    isVeg: f.is_veg,
    isAvailable: f.is_available,
    options: f.options ?? null,
    orderCount: Number(f.order_count ?? 0),
    bestseller: Boolean(f.bestseller),
    createdAt: f.created_at,
});

const cleanImageUrl = (value) => {
    const url = String(value || "").trim();
    // Photos bundled with the site (public/dishes) are referenced by path
    if (/^\/[\w\-/.]+\.(webp|jpe?g|png|avif)$/i.test(url) && !url.includes("..")) return url;
    try {
        const u = new URL(url);
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    } catch {
        throw badRequest("Please add a photo (upload one or paste an image URL).");
    }
    return url;
};

// { spice, halfPrice, addons } from the dish editor; null when nothing is offered
const cleanOptions = (value, price) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "object" || Array.isArray(value)) throw badRequest("Dish options are not valid.");
    const spice = Boolean(value.spice);
    const halfPrice = value.halfPrice === null || value.halfPrice === undefined || value.halfPrice === "" ? null : cleanInt(value.halfPrice, { field: "Half portion price", min: 1, max: 100000 });
    if (halfPrice !== null && halfPrice >= price) throw badRequest("A half portion should cost less than the full dish.");
    const list = Array.isArray(value.addons) ? value.addons : [];
    if (list.length > 10) throw badRequest("A dish can have up to 10 add-ons.");
    const addons = list.map((a) => {
        const label = cleanText(a?.label, { field: "Add-on name", min: 2, max: 40 });
        return { id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "addon", label, price: cleanInt(a?.price, { field: `Price of ${label}`, min: 0, max: 5000 }) };
    });
    if (new Set(addons.map((a) => a.id)).size !== addons.length) throw badRequest("Each add-on needs a different name.");
    if (!spice && halfPrice === null && !addons.length) return null;
    return { spice, halfPrice, addons };
};

const cleanFood = (body, current = {}) => {
    const pick = (key, fallback) => (body[key] !== undefined ? body[key] : fallback);
    const category = pick("category", current.category);
    if (!CATEGORY_IDS.includes(category)) throw badRequest("Please choose a valid category.");
    const price = cleanInt(pick("price", current.price), { field: "Price", min: 1, max: 100000 });
    return {
        name: cleanText(pick("name", current.name), { field: "Name", min: 2, max: 80 }),
        description: cleanText(pick("description", current.description), { field: "Description", min: 0, max: 300 }) ?? "",
        price,
        options: cleanOptions(pick("options", current.options), price),
        imageUrl: cleanImageUrl(pick("imageUrl", current.image_url)),
        category,
        isVeg: Boolean(pick("isVeg", current.is_veg ?? true)),
        isAvailable: Boolean(pick("isAvailable", current.is_available ?? true)),
    };
};

// Menu with real popularity: units sold in the last 30 days, top 6 flagged as bestsellers
router.get("/", async (_req, res) => {
    const rows = await sql`
        with sold as (
            select oi.food_id, sum(oi.quantity) as qty
            from order_items oi join orders o on o.id = oi.order_id
            where o.status not in ('cancelled', 'awaiting_payment') and o.created_at > now() - interval '30 days'
            group by oi.food_id
        ), ranked as (
            select food_id, qty, rank() over (order by qty desc) as r from sold
        )
        select f.*, coalesce(r.qty, 0) as order_count, (r.r is not null and r.r <= 6) as bestseller
        from foods f left join ranked r on r.food_id = f.id
        order by f.category, f.name`;
    res.json({ foods: rows.map(toFood) });
});

router.post("/", requireAdmin, async (req, res) => {
    const f = cleanFood(req.body);
    const [row] = await sql`
        insert into foods (name, description, price, image_url, category, is_veg, is_available, options)
        values (${f.name}, ${f.description}, ${f.price}, ${f.imageUrl}, ${f.category}, ${f.isVeg}, ${f.isAvailable}, ${f.options ? JSON.stringify(f.options) : null}::jsonb)
        returning *`;
    res.status(201).json({ food: toFood(row) });
});

router.patch("/:id", requireAdmin, async (req, res) => {
    const id = cleanId(req.params.id, "Dish");
    const [current] = await sql`select * from foods where id = ${id}`;
    if (!current) throw notFound("Dish not found.");
    const f = cleanFood(req.body, current);
    const [row] = await sql`
        update foods set name = ${f.name}, description = ${f.description}, price = ${f.price},
            image_url = ${f.imageUrl}, category = ${f.category}, is_veg = ${f.isVeg}, is_available = ${f.isAvailable},
            options = ${f.options ? JSON.stringify(f.options) : null}::jsonb
        where id = ${id} returning *`;
    res.json({ food: toFood(row) });
});

router.delete("/:id", requireAdmin, async (req, res) => {
    const id = cleanId(req.params.id, "Dish");
    const rows = await sql`delete from foods where id = ${id} returning id`;
    if (!rows.length) throw notFound("Dish not found.");
    res.json({ ok: true });
});

export default router;
