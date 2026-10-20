import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Bike, Clock3, Flame, LayoutGrid, Leaf, RefreshCw, Search, ShoppingBag, Store, X } from "lucide-react";
import FoodCard, { AddControl, FoodCardSkeleton } from "../../components/food/FoodCard";
import DishModal from "../../components/food/DishModal";
import { EmptyState, Switch, VegMark } from "../../components/ui";
import { useStore } from "../../context/StoreContext";
import { CATEGORY_OPTIONS } from "../../lib/categories";
import { formatPrice, plural } from "../../lib/format";
import { optimizedImage } from "../../lib/upload";
import { categoryLabel } from "../../../shared/menu";
import { useSearchFocusRequest } from "../../lib/viewTransition";
import "./Home.css";

const SORTS = [
    { id: "popular", label: "Popular" },
    { id: "price-asc", label: "Price: low to high" },
    { id: "price-desc", label: "Price: high to low" },
];

const sorters = {
    popular: (a, b) => Number(b.isAvailable) - Number(a.isAvailable) || b.orderCount - a.orderCount || a.name.localeCompare(b.name),
    "price-asc": (a, b) => Number(b.isAvailable) - Number(a.isAvailable) || a.price - b.price,
    "price-desc": (a, b) => Number(b.isAvailable) - Number(a.isAvailable) || b.price - a.price,
};

const Hero = ({ query, setQuery, searchRef }) => {
    const { foods, foodsState, settings } = useStore();
    const star = useMemo(() => [...foods].filter((f) => f.isAvailable).sort(sorters.popular)[0], [foods]);
    const vegCount = foods.filter((f) => f.isVeg).length;

    return (
        <section className="hero container">
            <div className="hero-copy fade-up">
                {settings ? (
                    <span className={`chip ${settings.storeOpen ? "chip-success" : "chip-danger"} hero-status`}>
                        <span className="live-dot" />
                        {settings.storeOpen ? `Open now · delivering in ~${settings.etaMinutes} min` : "Kitchen closed · back soon"}
                    </span>
                ) : (
                    <span className="skeleton" style={{ width: 220, height: 28, borderRadius: 999 }} />
                )}
                <h1>
                    Real Indian flavour,
                    <br />
                    <span className="gradient-text">delivered hot.</span>
                </h1>
                <p>Dum biryani, buttery curries, crisp dosas and street-side chaat from one kitchen. Cooked to order, tracked to your door.</p>
                <form className="hero-search" role="search" onSubmit={(e) => {
                    e.preventDefault();
                    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
                }}>
                    <Search size={20} />
                    <input
                        ref={searchRef}
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search biryani, dosa, paneer…"
                        aria-label="Search the menu"
                    />
                    {query ? (
                        <button type="button" className="icon-btn sm" onClick={() => setQuery("")} aria-label="Clear search">
                            <X size={17} />
                        </button>
                    ) : (
                        <kbd aria-hidden="true">/</kbd>
                    )}
                </form>
                <ul className="hero-stats">
                    <li>
                        <strong className="num">{foodsState === "ready" ? foods.length : "–"}</strong> dishes on the menu
                    </li>
                    <li>
                        <strong className="num">{foodsState === "ready" ? vegCount : "–"}</strong> vegetarian
                    </li>
                    {settings && (
                        <li>
                            Free delivery over <strong className="num">{formatPrice(settings.freeDeliveryOver)}</strong>
                        </li>
                    )}
                </ul>
            </div>

            <div className="hero-visual fade-up" style={{ animationDelay: ".08s" }}>
                {star ? (
                    <>
                        <div className="hero-photo">
                            <img src={optimizedImage(star.imageUrl, 900)} alt={star.name} fetchPriority="high" />
                        </div>
                        <div className="hero-float hero-float-star glass">
                            <span className="eyebrow">
                                <Flame size={13} /> Most ordered
                            </span>
                            <div className="hero-float-row">
                                <VegMark veg={star.isVeg} size={14} />
                                <strong>{star.name}</strong>
                            </div>
                            <div className="hero-float-row between">
                                <span className="num hero-float-price">{formatPrice(star.price)}</span>
                                <AddControl food={star} size="sm" />
                            </div>
                        </div>
                        {settings && (
                            <div className="hero-float hero-float-eta glass">
                                <span className="hero-float-icon">
                                    <Bike size={18} />
                                </span>
                                <div>
                                    <strong>~{settings.etaMinutes} min</strong>
                                    <span>average delivery</span>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="hero-photo skeleton" />
                )}
            </div>
        </section>
    );
};

const CartBar = () => {
    const { count, total, toFreeDelivery } = useStore();
    if (!count) return null;
    return (
        <Link to="/cart" className="cart-bar">
            <span className="cart-bar-icon">
                <ShoppingBag size={18} />
            </span>
            <span className="cart-bar-text">
                <strong>
                    {plural(count, "item")} · {formatPrice(total)}
                </strong>
                <span>{toFreeDelivery > 0 ? `Add ${formatPrice(toFreeDelivery)} more for free delivery` : "You've unlocked free delivery"}</span>
            </span>
            <span className="cart-bar-cta">
                View cart <ArrowRight size={17} />
            </span>
        </Link>
    );
};

const Home = () => {
    const { foods, foodsState, settings, retryFoods } = useStore();
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("all");
    const [vegOnly, setVegOnly] = useState(false);
    const [sort, setSort] = useState("popular");
    const [openFood, setOpenFood] = useState(null);
    const searchRef = useRef(null);
    const deferredQuery = useDeferredValue(query);

    // The tab bar's Search opens the menu with the search box ready
    const focusSearch = useCallback(() => {
        const input = searchRef.current;
        if (!input) return;
        input.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        input.focus({ preventScroll: true });
    }, []);
    useSearchFocusRequest(focusSearch);

    // "/" jumps to search, like most modern web apps
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== "/" || e.metaKey || e.ctrlKey || ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
            e.preventDefault();
            searchRef.current?.focus();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const counts = useMemo(() => {
        const c = { all: 0 };
        for (const f of foods) {
            if (vegOnly && !f.isVeg) continue;
            c.all++;
            c[f.category] = (c[f.category] || 0) + 1;
        }
        return c;
    }, [foods, vegOnly]);

    const visible = useMemo(() => {
        const q = deferredQuery.trim().toLowerCase();
        return foods
            .filter((f) => (category === "all" || f.category === category) && (!vegOnly || f.isVeg))
            .filter((f) => !q || `${f.name} ${f.description} ${categoryLabel(f.category)}`.toLowerCase().includes(q))
            .sort(sorters[sort]);
    }, [foods, category, vegOnly, sort, deferredQuery]);

    // Without a search or category, show the menu in sections like a real restaurant menu
    const sections = useMemo(() => {
        if (category !== "all" || deferredQuery.trim()) return null;
        return CATEGORY_OPTIONS.map((c) => ({ ...c, items: visible.filter((f) => f.category === c.id) })).filter((s) => s.items.length);
    }, [visible, category, deferredQuery]);

    const resetFilters = () => {
        setQuery("");
        setCategory("all");
        setVegOnly(false);
    };

    return (
        <div className="home">
            <Hero query={query} setQuery={setQuery} searchRef={searchRef} />

            {settings && !settings.storeOpen && (
                <div className="container">
                    <div className="closed-banner">
                        <Store size={20} />
                        <div>
                            <strong>The kitchen is closed right now.</strong>
                            <span> Browse the menu and fill your cart. You can order as soon as we reopen.</span>
                        </div>
                    </div>
                </div>
            )}

            <section id="menu" className="menu container" aria-label="Menu">
                <div className="menu-toolbar">
                    <div className="cat-rail" role="tablist" aria-label="Categories">
                        <button type="button" role="tab" aria-selected={category === "all"} className="cat-chip" onClick={() => setCategory("all")}>
                            <LayoutGrid size={16} /> All <span className="num">{counts.all}</span>
                        </button>
                        {CATEGORY_OPTIONS.map(({ id, label, icon: Icon }) => (
                            <button key={id} type="button" role="tab" aria-selected={category === id} className="cat-chip" onClick={() => setCategory(id)} disabled={foodsState === "ready" && !counts[id]}>
                                <Icon size={16} /> {label} <span className="num">{counts[id] || 0}</span>
                            </button>
                        ))}
                    </div>
                    <div className="menu-filters">
                        <label className="veg-toggle">
                            <Leaf size={16} />
                            Veg only
                            <Switch checked={vegOnly} onChange={setVegOnly} label="Show vegetarian dishes only" />
                        </label>
                        <select className="input menu-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort dishes">
                            {SORTS.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {foodsState === "loading" && (
                    <div className="food-grid">
                        {Array.from({ length: 8 }, (_, i) => (
                            <FoodCardSkeleton key={i} />
                        ))}
                    </div>
                )}

                {foodsState === "error" && (
                    <EmptyState icon={RefreshCw} title="We couldn't load the menu" action={<button className="btn btn-primary" onClick={retryFoods}>Try again</button>}>
                        Check your connection. If it keeps happening, the kitchen server may be waking up.
                    </EmptyState>
                )}

                {foodsState === "ready" && !foods.length && (
                    <EmptyState icon={Clock3} title="The menu is being prepared">
                        No dishes yet. If you run this project locally, run <code>npm run seed</code> to add the demo menu.
                    </EmptyState>
                )}

                {foodsState === "ready" && foods.length > 0 && !visible.length && (
                    <EmptyState icon={Search} title="Nothing matches that" action={<button className="btn btn-ghost" onClick={resetFilters}>Clear filters</button>}>
                        {query ? `No dishes match "${query}"` : "No dishes in this view"}
                        {vegOnly ? " with veg only on." : "."} Try another search or category.
                    </EmptyState>
                )}

                {foodsState === "ready" && visible.length > 0 && (
                    sections ? (
                        sections.map((s) => (
                            <div key={s.id} className="menu-section">
                                <h2>
                                    <s.icon size={20} /> {s.label}
                                    <span className="subtle num">{s.items.length}</span>
                                </h2>
                                <div className="food-grid">
                                    {s.items.map((f, i) => (
                                        <FoodCard key={f.id} food={f} onOpen={setOpenFood} index={i} />
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <>
                            <p className="menu-count muted" aria-live="polite">
                                {plural(visible.length, "dish", "dishes")}
                                {deferredQuery.trim() ? ` for "${deferredQuery.trim()}"` : ""}
                            </p>
                            <div className="food-grid">
                                {visible.map((f, i) => (
                                    <FoodCard key={f.id} food={f} onOpen={setOpenFood} index={i} />
                                ))}
                            </div>
                        </>
                    )
                )}
            </section>

            <CartBar />
            <DishModal food={openFood} onClose={() => setOpenFood(null)} />
        </div>
    );
};

export default Home;
