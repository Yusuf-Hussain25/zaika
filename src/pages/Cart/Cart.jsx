import { Link } from "react-router";
import { AlertTriangle, ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
import BillSummary from "../../components/food/BillSummary";
import { EmptyState, QtyStepper, VegMark } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useStore } from "../../context/StoreContext";
import { formatPrice, plural } from "../../lib/format";
import { optimizedImage } from "../../lib/upload";
import "./Cart.css";

const Cart = () => {
    const { user } = useAuth();
    const store = useStore();
    const { lines, count, subtotal, deliveryFee, total, toFreeDelivery, settings, soldOutInCart, foodsState, cartSyncing, add, remove, setQuantity } = store;
    const loading = foodsState === "loading" || cartSyncing;

    if (!loading && !lines.length) {
        return (
            <div className="container page">
                <EmptyState
                    icon={ShoppingBag}
                    title="Your cart is empty"
                    action={
                        <Link to="/" className="btn btn-primary">
                            Browse the menu <ArrowRight size={17} />
                        </Link>
                    }
                >
                    Add a biryani, a curry or something sweet. Everything is cooked fresh when you order.
                </EmptyState>
            </div>
        );
    }

    return (
        <div className="container page">
            <div className="page-head">
                <div>
                    <span className="eyebrow">Your cart</span>
                    <h1>{loading ? "Loading your cart…" : `${plural(count, "item")} ready to go`}</h1>
                </div>
                <Link to="/" className="btn btn-ghost btn-sm">
                    Add more dishes
                </Link>
            </div>

            <div className="cart-layout">
                <section className="card cart-lines" aria-label="Items in your cart">
                    {loading &&
                        [0, 1, 2].map((i) => (
                            <div key={i} className="cart-line">
                                <span className="skeleton" style={{ width: 72, height: 72, borderRadius: 16 }} />
                                <span style={{ flex: 1, display: "grid", gap: 8 }}>
                                    <span className="skeleton" style={{ height: 14, width: "55%" }} />
                                    <span className="skeleton" style={{ height: 12, width: "25%" }} />
                                </span>
                            </div>
                        ))}
                    {!loading &&
                        lines.map(({ food, quantity }) => (
                            <div key={food.id} className={`cart-line ${food.isAvailable ? "" : "is-sold-out"}`}>
                                <img src={optimizedImage(food.imageUrl, 160)} alt="" />
                                <div className="cart-line-info">
                                    <strong>
                                        <VegMark veg={food.isVeg} size={13} /> {food.name}
                                    </strong>
                                    <span className="muted num">
                                        {formatPrice(food.price)} each
                                        {!food.isAvailable && <em> · Sold out, please remove</em>}
                                    </span>
                                </div>
                                <div className="cart-line-actions">
                                    {food.isAvailable ? (
                                        <QtyStepper value={quantity} onAdd={() => add(food.id)} onRemove={() => remove(food.id)} name={food.name} size="sm" />
                                    ) : null}
                                    <span className="cart-line-total num">{formatPrice(food.price * quantity)}</span>
                                    <button type="button" className="icon-btn sm" onClick={() => setQuantity(food.id, 0)} aria-label={`Remove ${food.name} from cart`}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                </section>

                <aside className="card cart-summary">
                    <h2>Bill details</h2>
                    <BillSummary subtotal={subtotal} deliveryFee={deliveryFee} total={total} freeDeliveryOver={settings?.freeDeliveryOver} toFreeDelivery={toFreeDelivery} />
                    {soldOutInCart.length > 0 && (
                        <p className="cart-warning">
                            <AlertTriangle size={16} /> Remove sold-out dishes to continue.
                        </p>
                    )}
                    {settings && !settings.storeOpen && (
                        <p className="cart-warning">
                            <AlertTriangle size={16} /> The kitchen is closed right now. Your cart is saved for later.
                        </p>
                    )}
                    {user ? (
                        <Link
                            to="/checkout"
                            className="btn btn-primary btn-lg btn-block"
                            aria-disabled={loading || soldOutInCart.length > 0 || !settings?.storeOpen}
                            onClick={(e) => (loading || soldOutInCart.length > 0 || !settings?.storeOpen) && e.preventDefault()}
                        >
                            Checkout <ArrowRight size={18} />
                        </Link>
                    ) : (
                        <Link to="/login?next=/checkout" className="btn btn-primary btn-lg btn-block">
                            Sign in to checkout <ArrowRight size={18} />
                        </Link>
                    )}
                    {!user && <p className="subtle cart-note">Your cart is kept when you sign in.</p>}
                </aside>
            </div>
        </div>
    );
};

export default Cart;
