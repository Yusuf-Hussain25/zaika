import { Router } from "express";
import { sql } from "../db.js";
import { badRequest, cleanId, cleanInt, notFound } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { cleanChoice, lineKey } from "../../shared/menu.js";

const router = Router();
router.use(requireAuth);

// Cart as { lineId: { foodId, quantity, choice } }, only for dishes that still exist.
// A line is a dish plus the customer's choice of portion, spice and add-ons (see shared/menu.js).
export const readCart = async (userId) => {
    const rows = await sql`select line_id, food_id, quantity, choice from cart_items where user_id = ${userId} order by line_id`;
    return Object.fromEntries(rows.map((r) => [r.line_id, { foodId: r.food_id, quantity: r.quantity, choice: r.choice }]));
};

const LINE = /^[0-9a-f-]{36}(:[a-z0-9:+-]{1,200})?$/i;

// Adds `quantity` of a dish + choice to the cart. The line id is always recomputed from the
// validated choice, so the browser can't invent lines or prices. Returns how many entries were
// added (sold-out and removed dishes are skipped).
const addLines = async (userId, entries) => {
    const ids = [...new Set(entries.map((e) => e.foodId))];
    if (!ids.length) return 0;
    const foods = new Map((await sql`select id, options from foods where id = any(${ids}::uuid[]) and is_available`).map((f) => [f.id, f]));
    const rows = [];
    for (const e of entries) {
        const food = foods.get(e.foodId);
        if (!food) continue;
        const choice = cleanChoice(food, e.choice);
        rows.push({ line: lineKey(food.id, choice), food: food.id, qty: e.quantity, choice: JSON.stringify(choice) });
    }
    if (!rows.length) return 0;
    await sql`
        insert into cart_items (user_id, line_id, food_id, quantity, choice)
        select ${userId}, g.line, g.food, least(sum(g.qty), 50), (array_agg(g.choice))[1]::jsonb
        from unnest(${rows.map((r) => r.line)}::text[], ${rows.map((r) => r.food)}::uuid[], ${rows.map((r) => r.qty)}::int[], ${rows.map((r) => r.choice)}::text[])
             as g(line, food, qty, choice)
        group by g.line, g.food
        on conflict (user_id, line_id) do update set quantity = least(cart_items.quantity + excluded.quantity, 50)`;
    return rows.length;
};

router.get("/", async (req, res) => {
    res.json({ items: await readCart(req.user.id) });
});

// Set one line's quantity; 0 removes it. Body: { quantity, foodId?, choice? }.
// Without foodId the line id is a plain dish id (the default choice).
router.put("/:lineId", async (req, res) => {
    const lineId = String(req.params.lineId);
    if (!LINE.test(lineId)) throw notFound("That cart item was not found.");
    const quantity = cleanInt(req.body.quantity, { field: "Quantity", min: 0, max: 50 });
    if (quantity === 0) {
        await sql`delete from cart_items where user_id = ${req.user.id} and line_id = ${lineId}`;
        return res.json({ items: await readCart(req.user.id) });
    }
    const foodId = cleanId(req.body.foodId ?? lineId, "Dish");
    const [food] = await sql`select id, is_available, options from foods where id = ${foodId}`;
    if (!food) throw notFound("That dish is no longer on the menu.");
    if (!food.is_available) throw badRequest("That dish is sold out right now.");
    const choice = cleanChoice(food, req.body.choice);
    if (lineKey(food.id, choice) !== lineId) throw badRequest("Those options aren't available for this dish any more. Please add it again.");
    await sql`
        insert into cart_items (user_id, line_id, food_id, quantity, choice)
        values (${req.user.id}, ${lineId}, ${food.id}, ${quantity}, ${JSON.stringify(choice)}::jsonb)
        on conflict (user_id, line_id) do update set quantity = excluded.quantity`;
    res.json({ items: await readCart(req.user.id) });
});

// Adds a guest cart (kept in the browser before login) to the saved cart.
// Accepts { lineId: { foodId, quantity, choice } } and the older { foodId: quantity }.
router.post("/merge", async (req, res) => {
    const entries = [];
    for (const [id, value] of Object.entries(req.body.items || {}).slice(0, 100)) {
        const line = typeof value === "number" ? { foodId: id, quantity: value } : value || {};
        const n = Number(line.quantity);
        if (/^[0-9a-f-]{36}$/i.test(String(line.foodId)) && Number.isInteger(n) && n > 0) {
            entries.push({ foodId: String(line.foodId), quantity: Math.min(n, 50), choice: line.choice });
        }
    }
    await addLines(req.user.id, entries);
    res.json({ items: await readCart(req.user.id) });
});

router.delete("/", async (req, res) => {
    await sql`delete from cart_items where user_id = ${req.user.id}`;
    res.json({ items: {} });
});

export { addLines };
export default router;
