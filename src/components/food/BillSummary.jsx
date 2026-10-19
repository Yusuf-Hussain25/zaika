import { Bike } from "lucide-react";
import { formatPrice } from "../../lib/format";
import "./BillSummary.css";

// Subtotal, delivery and total, plus a progress bar towards free delivery
const BillSummary = ({ subtotal, deliveryFee, total, freeDeliveryOver, toFreeDelivery }) => {
    const progress = freeDeliveryOver ? Math.min(100, Math.round((subtotal / freeDeliveryOver) * 100)) : 100;
    return (
        <div className="bill">
            {freeDeliveryOver > 0 && subtotal > 0 && (
                <div className={`bill-free ${toFreeDelivery > 0 ? "" : "is-unlocked"}`}>
                    <div className="bill-free-text">
                        <Bike size={16} />
                        {toFreeDelivery > 0 ? (
                            <span>
                                Add <strong>{formatPrice(toFreeDelivery)}</strong> more for free delivery
                            </span>
                        ) : (
                            <span>
                                <strong>Free delivery</strong> unlocked
                            </span>
                        )}
                    </div>
                    <div className="bill-free-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free delivery">
                        <span style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}
            <dl>
                <div>
                    <dt>Item total</dt>
                    <dd className="num">{formatPrice(subtotal)}</dd>
                </div>
                <div>
                    <dt>Delivery fee</dt>
                    <dd className="num">{deliveryFee ? formatPrice(deliveryFee) : <span className="bill-free-tag">FREE</span>}</dd>
                </div>
                <div className="bill-total">
                    <dt>To pay</dt>
                    <dd className="num">{formatPrice(total)}</dd>
                </div>
            </dl>
        </div>
    );
};

export default BillSummary;
