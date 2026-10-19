import { Router } from "express";
import { sql } from "../db.js";
import { badRequest, cleanId, cleanInt, notFound } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

// Cart as { foodId: quantity }, only for dishes that still exist
export const readCart = async (userId) => {
    const rows = await sql`select food_id, quantity from cart_items where user_id = ${userId}`;
    return Object.fromEntries(rows.map((r) => [r.food_id, r.quantity]));
};

router.get("/", async (req, res) => {
    res.json({ items: await readCart(req.user.id) });
});

// Set one line's quantity; 0 removes it
router.put("/:foodId", async (req, res) => {
    const foodId = cleanId(req.params.foodId, "Dish");
    const quantity = cleanInt(req.body.quantity, { field: "Quantity", min: 0, max: 50 });
    if (quantity === 0) {
        await sql`delete from cart_items where user_id = ${req.user.id} and food_id = ${foodId}`;
    } else {
        const [food] = await sql`select is_available from foods where id = ${foodId}`;
        if (!food) throw notFound("That dish is no longer on the menu.");
        if (!food.is_available) throw badRequest("That dish is sold out right now.");
        await sql`
            insert into cart_items (user_id, food_id, quantity) values (${req.user.id}, ${foodId}, ${quantity})
            on conflict (user_id, food_id) do update set quantity = excluded.quantity`;
    }
    res.json({ items: await readCart(req.user.id) });
});

// Adds a guest cart (kept in the browser before login) to the saved cart
router.post("/merge", async (req, res) => {
    const entries = Object.entries(req.body.items || {}).slice(0, 100);
    const ids = [];
    const qtys = [];
    for (const [id, qty] of entries) {
        const n = Number(qty);
        if (/^[0-9a-f-]{36}$/i.test(id) && Number.isInteger(n) && n > 0) {
            ids.push(id);
            qtys.push(Math.min(n, 50));
        }
    }
    if (ids.length) {
        await sql`
            insert into cart_items (user_id, food_id, quantity)
            select ${req.user.id}, f.id, g.qty
            from unnest(${ids}::uuid[], ${qtys}::int[]) as g(id, qty)
            join foods f on f.id = g.id and f.is_available
            on conflict (user_id, food_id) do update set quantity = least(cart_items.quantity + excluded.quantity, 50)`;
    }
    res.json({ items: await readCart(req.user.id) });
});

router.delete("/", async (req, res) => {
    await sql`delete from cart_items where user_id = ${req.user.id}`;
    res.json({ items: {} });
});

export default router;
