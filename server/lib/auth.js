import jwt from "jsonwebtoken";
import { sql } from "../db.js";
import { HttpError } from "./http.js";

const secret = () => {
    const value = process.env.JWT_SECRET;
    if (!value) throw new HttpError(500, "JWT_SECRET is not set. Add it to .env.");
    return value;
};

export const signToken = (user) => jwt.sign({ sub: user.id }, secret(), { expiresIn: "14d" });

// Public shape of a user; never includes the password hash
export const publicUser = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone ?? null,
    address: u.address ?? null,
    createdAt: u.created_at,
});

const loadUser = async (req) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return null;
    let payload;
    try {
        payload = jwt.verify(token, secret());
    } catch {
        throw new HttpError(401, "Your session has expired. Please log in again.");
    }
    // The role is read from the database on every request, so demoting an admin takes effect at once
    const [user] = await sql`select * from users where id = ${payload.sub}`;
    if (!user) throw new HttpError(401, "Your account no longer exists. Please sign up again.");
    return user;
};

export const optionalAuth = async (req, _res, next) => {
    req.user = await loadUser(req);
    next();
};

export const requireAuth = async (req, _res, next) => {
    req.user = await loadUser(req);
    if (!req.user) throw new HttpError(401, "Please log in to continue.");
    next();
};

export const isStaff = (user) => user?.role === "admin" || user?.role === "demo_admin";

// Admin panel reads: real admins and the read-only demo admin
export const requireStaff = async (req, res, next) => {
    await requireAuth(req, res, () => {});
    if (!isStaff(req.user)) throw new HttpError(403, "Only restaurant staff can do that.");
    next();
};

// Admin panel writes: real admins only
export const requireAdmin = async (req, res, next) => {
    await requireAuth(req, res, () => {});
    if (req.user.role === "demo_admin") throw new HttpError(403, "The demo admin is read-only. Changes are disabled.");
    if (req.user.role !== "admin") throw new HttpError(403, "Only restaurant admins can do that.");
    next();
};
