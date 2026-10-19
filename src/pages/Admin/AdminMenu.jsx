import { useDeferredValue, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import DishForm from "./DishForm";
import { EmptyState, Modal, Switch, VegMark } from "../../components/ui";
import "../../components/food/FoodCard.css";
import { useAuth } from "../../context/AuthContext";
import { useStore } from "../../context/StoreContext";
import { api } from "../../lib/api";
import { formatPrice, plural } from "../../lib/format";
import { optimizedImage } from "../../lib/upload";
import { CATEGORIES, categoryLabel } from "../../../shared/menu";

const STOCK = [
    { id: "all", label: "All" },
    { id: "in", label: "In stock" },
    { id: "out", label: "Sold out" },
];

const AdminMenu = () => {
    const { isDemoAdmin } = useAuth();
    const { foods, foodsState, setFoods } = useStore();
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("all");
    const [stock, setStock] = useState("all");
    const [editing, setEditing] = useState(null); // food | "new" | null
    const [deleting, setDeleting] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const q = useDeferredValue(query.trim().toLowerCase());

    const visible = useMemo(
        () =>
            foods
                .filter((f) => category === "all" || f.category === category)
                .filter((f) => stock === "all" || (stock === "in" ? f.isAvailable : !f.isAvailable))
                .filter((f) => !q || f.name.toLowerCase().includes(q))
                .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)),
        [foods, category, stock, q],
    );
    const soldOut = foods.filter((f) => !f.isAvailable).length;

    // Write responses don't carry sales stats, so keep the ones we already have
    const replace = (food) =>
        setFoods((list) =>
            list.some((f) => f.id === food.id)
                ? list.map((f) => (f.id === food.id ? { ...f, ...food, orderCount: f.orderCount, bestseller: f.bestseller } : f))
                : [...list, food],
        );

    // Optimistic stock toggle: flip now, roll back if the API refuses
    const toggleStock = async (food, isAvailable) => {
        setBusyId(food.id);
        replace({ ...food, isAvailable });
        try {
            await api(`/foods/${food.id}`, { method: "PATCH", body: { isAvailable } });
            toast.success(`${food.name} is ${isAvailable ? "back in stock" : "marked sold out"}`);
        } catch (err) {
            replace(food);
            toast.error(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const remove = async () => {
        const food = deleting;
        setBusyId(food.id);
        try {
            await api(`/foods/${food.id}`, { method: "DELETE" });
            setFoods((list) => list.filter((f) => f.id !== food.id));
            toast.success(`${food.name} removed from the menu`);
            setDeleting(null);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="admin-page">
            <div className="page-head">
                <div>
                    <span className="eyebrow">Menu</span>
                    <h1>Dishes</h1>
                    <p>
                        {plural(foods.length, "dish", "dishes")} on the menu{soldOut ? `, ${soldOut} sold out` : ""}. Changes show on the storefront instantly.
                    </p>
                </div>
                <button type="button" className="btn btn-primary" onClick={() => setEditing("new")} disabled={isDemoAdmin} title={isDemoAdmin ? "Read-only demo" : undefined}>
                    <Plus size={18} /> Add dish
                </button>
            </div>

            <div className="admin-toolbar">
                <div className="input-wrap admin-search">
                    <Search size={17} />
                    <input className="input" type="search" placeholder="Search dishes" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search dishes" />
                </div>
                <select className="input admin-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
                    <option value="all">All categories</option>
                    {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.label}
                        </option>
                    ))}
                </select>
                <div className="segmented" role="group" aria-label="Stock">
                    {STOCK.map((s) => (
                        <button key={s.id} type="button" aria-pressed={stock === s.id} onClick={() => setStock(s.id)}>
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card table-card">
                {foodsState === "loading" ? (
                    <div style={{ padding: 16, display: "grid", gap: 10 }}>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="skeleton" style={{ height: 56 }} />
                        ))}
                    </div>
                ) : !visible.length ? (
                    <EmptyState icon={UtensilsCrossed} title={foods.length ? "No dishes match" : "No dishes yet"}>
                        {foods.length ? "Try another search or filter." : "Add your first dish to open the menu."}
                    </EmptyState>
                ) : (
                    <table className="data-table menu-table">
                        <thead>
                            <tr>
                                <th>Dish</th>
                                <th className="hide-sm">Category</th>
                                <th>Price</th>
                                <th className="hide-sm" title="Units sold in the last 30 days">Sold (30d)</th>
                                <th>In stock</th>
                                <th>
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((f) => (
                                <tr key={f.id} className={f.isAvailable ? "" : "is-off"}>
                                    <td>
                                        <span className="cell-dish">
                                            <img src={optimizedImage(f.imageUrl, 96)} alt="" loading="lazy" />
                                            <span>
                                                <strong>
                                                    <VegMark veg={f.isVeg} size={12} /> {f.name}
                                                </strong>
                                                {f.bestseller && <span className="chip chip-accent cell-chip">Bestseller</span>}
                                            </span>
                                        </span>
                                    </td>
                                    <td className="hide-sm muted">{categoryLabel(f.category)}</td>
                                    <td className="num strong">{formatPrice(f.price)}</td>
                                    <td className="hide-sm num">{f.orderCount}</td>
                                    <td>
                                        <Switch checked={f.isAvailable} onChange={(v) => toggleStock(f, v)} label={`${f.name} in stock`} disabled={isDemoAdmin || busyId === f.id} />
                                    </td>
                                    <td>
                                        <span className="row-actions">
                                            <button type="button" className="icon-btn sm" onClick={() => setEditing(f)} aria-label={`Edit ${f.name}`}>
                                                <Pencil size={16} />
                                            </button>
                                            <button type="button" className="icon-btn sm danger" onClick={() => setDeleting(f)} aria-label={`Delete ${f.name}`} disabled={isDemoAdmin}>
                                                <Trash2 size={16} />
                                            </button>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {editing && (
                <DishForm
                    food={editing === "new" ? null : editing}
                    readOnly={isDemoAdmin}
                    onClose={() => setEditing(null)}
                    onSaved={(food) => {
                        replace(food);
                        setEditing(null);
                    }}
                />
            )}

            <Modal
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                size="sm"
                title="Delete this dish?"
                footer={
                    <>
                        <button type="button" className="btn btn-ghost" onClick={() => setDeleting(null)}>
                            Keep it
                        </button>
                        <button type="button" className="btn btn-danger" onClick={remove} disabled={busyId === deleting?.id}>
                            {busyId === deleting?.id && <span className="spinner" />} Delete
                        </button>
                    </>
                }
            >
                <p className="muted">
                    {deleting?.name} will disappear from the menu and from carts. Past orders keep their copy of it. Marking it sold out instead keeps it on the menu.
                </p>
            </Modal>
        </div>
    );
};

export default AdminMenu;
