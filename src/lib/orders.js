import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { optionsLabel } from "../../shared/menu";

export const itemsSummary = (items) =>
    items.map((i) => `${i.name}${i.options ? ` (${optionsLabel(i.options)})` : ""} × ${i.quantity}`).join(", ");

export const isActive = (status) => ["awaiting_payment", "placed", "preparing", "out_for_delivery"].includes(status);

// Delivery promise: order time plus the kitchen's ETA
export const arrivalTime = (order, etaMinutes = 35) => new Date(new Date(order.createdAt).getTime() + etaMinutes * 60000);

export const PAYMENT_METHODS = {
    cod: { label: "Cash on delivery", icon: Banknote },
    card: { label: "Card (Stripe)", icon: CreditCard },
    razorpay: { label: "Online (Razorpay)", icon: Smartphone },
};
