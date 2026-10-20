// Shared by the API (validation) and the React app (labels, filters).

export const CATEGORIES = [
    { id: "biryani", label: "Biryani" },
    { id: "north-indian", label: "North Indian" },
    { id: "south-indian", label: "South Indian" },
    { id: "street-food", label: "Street Food" },
    { id: "rolls", label: "Rolls & Wraps" },
    { id: "chinese", label: "Indo-Chinese" },
    { id: "desserts", label: "Desserts" },
    { id: "drinks", label: "Beverages" },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

// Kitchen flow, in order. awaiting_payment and cancelled sit outside it.
export const ORDER_FLOW = ["placed", "preparing", "out_for_delivery", "delivered"];

export const ORDER_STATUS = {
    awaiting_payment: { label: "Awaiting payment", short: "Unpaid" },
    placed: { label: "Order placed", short: "Placed" },
    preparing: { label: "Preparing", short: "Preparing" },
    out_for_delivery: { label: "Out for delivery", short: "On the way" },
    delivered: { label: "Delivered", short: "Delivered" },
    cancelled: { label: "Cancelled", short: "Cancelled" },
};

export const nextStatus = (status) => {
    const i = ORDER_FLOW.indexOf(status);
    return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null;
};

// ------------------------------------------------------------------ dish options
// A dish's options (foods.options) look like:
//   { spice: true, halfPrice: 189, addons: [{ id: "extra-raita", label: "Extra raita", price: 30 }] }
// A customer's choice for one cart line looks like:
//   { portion: "half" | "full", spice: "mild" | "medium" | "hot" | null, addons: ["extra-raita"] }

export const SPICE_LEVELS = [
    { id: "mild", label: "Mild" },
    { id: "medium", label: "Medium" },
    { id: "hot", label: "Hot" },
];
const SPICE_IDS = SPICE_LEVELS.map((s) => s.id);

export const hasOptions = (food) => Boolean(food?.options && (food.options.spice || food.options.halfPrice || food.options.addons?.length));

// Keeps only what this dish offers; anything missing falls back to the default (full, medium, no add-ons)
export const cleanChoice = (food, choice) => {
    const o = food.options || {};
    const c = choice && typeof choice === "object" ? choice : {};
    const offered = new Set((o.addons || []).map((a) => a.id));
    return {
        portion: o.halfPrice && c.portion === "half" ? "half" : "full",
        spice: o.spice ? (SPICE_IDS.includes(c.spice) ? c.spice : "medium") : null,
        addons: [...new Set(Array.isArray(c.addons) ? c.addons : [])].filter((id) => offered.has(id)).sort(),
    };
};

// One cart line per dish + choice. The default choice keeps the plain dish id, so carts saved
// before options existed (and dishes without options) need no migration.
export const lineKey = (foodId, choice) => {
    let key = foodId;
    if (choice.portion === "half") key += ":half";
    if (choice.spice && choice.spice !== "medium") key += `:${choice.spice}`;
    if (choice.addons.length) key += `:+${choice.addons.join("+")}`;
    return key;
};

export const unitPrice = (food, choice) => {
    const base = choice.portion === "half" && food.options?.halfPrice ? food.options.halfPrice : food.price;
    const addons = (food.options?.addons || []).filter((a) => choice.addons.includes(a.id));
    return base + addons.reduce((sum, a) => sum + a.price, 0);
};

// What gets stored on the order line: labels and prices as they were when ordered
export const snapshotChoice = (food, choice) => {
    if (!hasOptions(food)) return null;
    return {
        portion: food.options.halfPrice ? choice.portion : null,
        spice: choice.spice,
        addons: food.options.addons.filter((a) => choice.addons.includes(a.id)).map(({ id, label, price }) => ({ id, label, price })),
    };
};

// "Half · Hot · Extra raita, Butter naan" for carts, receipts and kitchen tickets
export const optionsLabel = (snapshot) => {
    if (!snapshot) return "";
    const parts = [];
    if (snapshot.portion) parts.push(snapshot.portion === "half" ? "Half" : "Full");
    if (snapshot.spice) parts.push(`${SPICE_LEVELS.find((s) => s.id === snapshot.spice)?.label ?? snapshot.spice} spice`);
    if (snapshot.addons?.length) parts.push(snapshot.addons.map((a) => a.label).join(", "));
    return parts.join(" · ");
};
