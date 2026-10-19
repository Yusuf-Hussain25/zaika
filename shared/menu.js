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
