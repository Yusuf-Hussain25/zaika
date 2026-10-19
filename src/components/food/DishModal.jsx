import { Flame } from "lucide-react";
import { Modal, VegMark } from "../ui";
import { AddControl } from "./FoodCard";
import { formatPrice } from "../../lib/format";
import { optimizedImage } from "../../lib/upload";
import { CategoryIcon } from "../../lib/categories";
import { categoryLabel } from "../../../shared/menu";

// Quick view for a dish: bigger photo, full description and real popularity
const DishModal = ({ food, onClose }) => {
    return (
        <Modal open={Boolean(food)} onClose={onClose} className="dish-modal" title={food?.name}>
            {food && (
                <div className="dish-modal-body">
                    <div className="dish-modal-media">
                        <img src={optimizedImage(food.imageUrl, 900)} alt={food.name} />
                    </div>
                    <div className="dish-modal-meta">
                        <span className={`chip ${food.isVeg ? "chip-success" : "chip-danger"}`}>
                            <VegMark veg={food.isVeg} size={13} /> {food.isVeg ? "Veg" : "Non-veg"}
                        </span>
                        <span className="chip">
                            <CategoryIcon id={food.category} size={14} /> {categoryLabel(food.category)}
                        </span>
                        {food.bestseller && (
                            <span className="chip chip-accent">
                                <Flame size={14} /> Bestseller
                            </span>
                        )}
                    </div>
                    <p className="dish-modal-desc">{food.description}</p>
                    {food.orderCount > 0 && <p className="subtle dish-modal-pop">Ordered {food.orderCount} times in the last 30 days</p>}
                    <div className="dish-modal-foot">
                        <span className="dish-modal-price num">{formatPrice(food.price)}</span>
                        <AddControl food={food} />
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default DishModal;
