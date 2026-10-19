import { createElement } from "react";
import { Bike, Check, ChefHat, PackageCheck, Receipt, X } from "lucide-react";
import { VegMark } from "../ui";
import { formatPrice, formatTime } from "../../lib/format";
import { optimizedImage } from "../../lib/upload";
import { ORDER_FLOW, ORDER_STATUS } from "../../../shared/menu";
import "./OrderParts.css";

const STEP_ICONS = { placed: Receipt, preparing: ChefHat, out_for_delivery: Bike, delivered: PackageCheck };

// Vertical tracker: each step shows when it happened, the current one pulses
export const OrderTimeline = ({ order, compact = false }) => {
    const cancelled = order.status === "cancelled";
    const at = Object.fromEntries(order.events.map((e) => [e.status, e.at]));
    const reached = ORDER_FLOW.indexOf(order.status);
    const steps = cancelled ? [...ORDER_FLOW.filter((s) => at[s]), "cancelled"] : ORDER_FLOW;

    return (
        <ol className={`timeline ${compact ? "compact" : ""}`}>
            {steps.map((s, i) => {
                const done = cancelled ? true : i <= reached;
                const current = !cancelled && i === reached && order.status !== "delivered";
                return (
                    <li key={s} className={`${done ? "done" : ""} ${current ? "current" : ""} ${s === "cancelled" ? "cancelled" : ""}`}>
                        <span className="timeline-dot">{done && !current && s !== "cancelled" ? <Check size={14} strokeWidth={3} /> : createElement(s === "cancelled" ? X : STEP_ICONS[s], { size: 15 })}</span>
                        <div className="timeline-text">
                            <strong>{ORDER_STATUS[s].label}</strong>
                            <span>{at[s] ? formatTime(at[s]) : current ? "In progress" : "Pending"}</span>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
};

export const OrderItems = ({ items }) => (
    <ul className="order-items">
        {items.map((item, i) => (
            <li key={`${item.name}-${i}`}>
                {item.imageUrl ? <img src={optimizedImage(item.imageUrl, 120)} alt="" loading="lazy" /> : <span className="order-items-ph" />}
                <span className="order-items-name">
                    <VegMark veg={item.isVeg} size={12} /> {item.name}
                    <span className="subtle num"> × {item.quantity}</span>
                </span>
                <span className="num">{formatPrice(item.price * item.quantity)}</span>
            </li>
        ))}
    </ul>
);

export const OrderThumbs = ({ items, max = 4 }) => (
    <div className="order-thumbs">
        {items.slice(0, max).map((item, i) =>
            item.imageUrl ? <img key={i} src={optimizedImage(item.imageUrl, 96)} alt="" loading="lazy" /> : <span key={i} className="order-items-ph" />,
        )}
        {items.length > max && <span className="order-thumbs-more">+{items.length - max}</span>}
    </div>
);

export const AddressBlock = ({ address }) => (
    <address className="address-block">
        <strong>{address.name}</strong>
        <span>{address.line1}</span>
        {address.landmark && <span>{address.landmark}</span>}
        <span>
            {address.city} {address.pincode}
        </span>
        <span className="mono">{address.phone}</span>
    </address>
);
