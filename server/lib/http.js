// Small helpers shared by every route.

export class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
        this.expose = true;
    }
}

export const badRequest = (message) => new HttpError(400, message);
export const notFound = (what = "Not found") => new HttpError(404, what);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const cleanEmail = (value) => {
    const email = String(value || "").trim().toLowerCase();
    if (!EMAIL.test(email)) throw badRequest("Please enter a valid email address.");
    return email;
};

export const cleanText = (value, { field, min = 1, max = 200, optional = false } = {}) => {
    const text = String(value ?? "").trim();
    if (!text && optional) return null;
    if (text.length < min) throw badRequest(`${field} is required.`);
    if (text.length > max) throw badRequest(`${field} is too long (max ${max} characters).`);
    return text;
};

export const cleanInt = (value, { field, min = 0, max = 1_000_000 } = {}) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) throw badRequest(`${field} must be a whole number between ${min} and ${max}.`);
    return n;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const cleanId = (value, what = "Item") => {
    if (!UUID.test(String(value))) throw notFound(`${what} not found.`);
    return String(value);
};

const PHONE = /^[+\d][\d\s-]{6,18}$/;
export const cleanAddress = (input = {}) => {
    const address = {
        name: cleanText(input.name, { field: "Name", max: 80 }),
        phone: cleanText(input.phone, { field: "Phone", max: 20 }),
        line1: cleanText(input.line1, { field: "Address", max: 160 }),
        landmark: cleanText(input.landmark, { field: "Landmark", max: 100, optional: true }),
        city: cleanText(input.city, { field: "City", max: 60 }),
        pincode: cleanText(input.pincode, { field: "PIN code", max: 10 }),
    };
    if (!PHONE.test(address.phone)) throw badRequest("Please enter a valid phone number.");
    if (!/^\d{6}$/.test(address.pincode)) throw badRequest("PIN code must be 6 digits.");
    return address;
};

// Public, same-for-everyone responses (menu, store settings). For signed-out visitors the
// Vercel CDN keeps a copy for a minute and keeps serving it while it refreshes in the
// background, so the storefront opens instantly even while the database is waking up.
// Signed-in requests (they carry a token) always get fresh data, so admins see edits at once.
export const publicCache = (req, res) => {
    res.vary("Authorization");
    if (req.headers.authorization) res.set("Cache-Control", "private, no-store");
    else res.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=86400");
};
