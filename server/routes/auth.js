import { Router } from "express";
import bcrypt from "bcryptjs";
import { sql } from "../db.js";
import { HttpError, badRequest, cleanAddress, cleanEmail, cleanText } from "../lib/http.js";
import { publicUser, requireAuth, signToken } from "../lib/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
    const name = cleanText(req.body.name, { field: "Name", min: 2, max: 60 });
    const email = cleanEmail(req.body.email);
    const password = String(req.body.password || "");
    if (password.length < 8) throw badRequest("Password must be at least 8 characters.");

    const hash = await bcrypt.hash(password, 10);
    const [user] = await sql`
        insert into users (name, email, password_hash) values (${name}, ${email}, ${hash})
        on conflict (email) do nothing
        returning *`;
    if (!user) throw new HttpError(409, "An account with this email already exists. Try logging in.");
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post("/login", async (req, res) => {
    const email = cleanEmail(req.body.email);
    const [user] = await sql`select * from users where email = ${email}`;
    // Same message for unknown email and wrong password, so emails can't be probed
    const ok = user && (await bcrypt.compare(String(req.body.password || ""), user.password_hash));
    if (!ok) throw new HttpError(401, "Incorrect email or password.");
    res.json({ token: signToken(user), user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
    res.json({ user: publicUser(req.user) });
});

router.patch("/me", requireAuth, async (req, res) => {
    const name = req.body.name !== undefined ? cleanText(req.body.name, { field: "Name", min: 2, max: 60 }) : req.user.name;
    const phone = req.body.phone !== undefined ? cleanText(req.body.phone, { field: "Phone", max: 20, optional: true }) : req.user.phone;
    const address = req.body.address !== undefined ? (req.body.address ? cleanAddress(req.body.address) : null) : req.user.address;
    const [user] = await sql`
        update users set name = ${name}, phone = ${phone}, address = ${address ? JSON.stringify(address) : null}::jsonb
        where id = ${req.user.id} returning *`;
    res.json({ user: publicUser(user) });
});

export default router;
