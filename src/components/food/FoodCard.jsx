import { Flame, Plus } from "lucide-react";
import { QtyStepper, VegMark } from "../ui";
import { useStore } from "../../context/StoreContext";
import { formatPrice } from "../../lib/format";
import { optimizedImage } from "../../lib/upload";
import "./FoodCard.css";

export const AddControl = ({ food, size = "md" }) => {
    const { cart, add, remove } = useStore();
    const qty = cart[food.id] || 0;
    if (!food.isAvailable) {
        return <span className="sold-out-tag">Sold out</span>;
    }
    if (qty > 0) {
        return <QtyStepper value={qty} onAdd={() => add(food.id)} onRemove={() => remove(food.id)} name={food.name} size={size} />;
    }
    return (
        <button type="button" className={`btn btn-soft add-btn ${size === "sm" ? "btn-sm" : ""}`} onClick={() => add(food.id)} aria-label={`Add ${food.name} to cart`}>
            <Plus size={16} strokeWidth={2.4} /> Add
        </button>
    );
};

const FoodCard = ({ food, onOpen, index = 0 }) => (
    <article className={`food-card ${food.isAvailable ? "" : "is-sold-out"}`} style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}>
        <button type="button" className="food-card-media" onClick={() => onOpen(food)} aria-label={`View ${food.name}`}>
            <img src={optimizedImage(food.imageUrl, 480)} alt="" loading="lazy" decoding="async" />
            {food.bestseller && (
                <span className="food-card-badge">
                    <Flame size={13} /> Bestseller
                </span>
            )}
        </button>
        <div className="food-card-body">
            <div className="food-card-title">
                <VegMark veg={food.isVeg} size={15} />
                <h3>
                    <button type="button" onClick={() => onOpen(food)}>
                        {food.name}
                    </button>
                </h3>
            </div>
            <p>{food.description}</p>
            <div className="food-card-foot">
                <span className="food-card-price num">{formatPrice(food.price)}</span>
                <AddControl food={food} size="sm" />
            </div>
        </div>
    </article>
);

export const FoodCardSkeleton = () => (
    <div className="food-card" aria-hidden="true">
        <div className="skeleton" style={{ aspectRatio: "4 / 3", borderRadius: 18 }} />
        <div className="food-card-body">
            <div className="skeleton" style={{ height: 16, width: "70%" }} />
            <div className="skeleton" style={{ height: 12, width: "95%" }} />
            <div className="skeleton" style={{ height: 12, width: "60%" }} />
            <div className="food-card-foot">
                <div className="skeleton" style={{ height: 18, width: 60 }} />
                <div className="skeleton" style={{ height: 32, width: 72, borderRadius: 10 }} />
            </div>
        </div>
    </div>
);

export default FoodCard;
