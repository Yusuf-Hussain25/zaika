const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

export const formatPrice = (amount) => rupees.format(amount || 0);

// ₹1.2L / ₹45K style for dashboard tiles
export const formatCompactPrice = (amount) => `₹${compact.format(amount || 0)}`;

export const orderCode = (number) => `ZK-${number}`;

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
];

export const timeAgo = (date, now = Date.now()) => {
    const seconds = Math.round((new Date(date).getTime() - now) / 1000);
    if (Math.abs(seconds) < 45) return "just now";
    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size || unit === "minute") return rtf.format(Math.round(seconds / size), unit);
    }
    return "just now";
};

export const formatDateTime = (date) =>
    new Date(date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const formatTime = (date) => new Date(date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export const formatDate = (date) => new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

export const initials = (name = "") =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("") || "?";

// Percent change for KPI deltas; null when there is nothing to compare against
export const percentChange = (now, before) => (before ? Math.round(((now - before) / before) * 100) : null);
