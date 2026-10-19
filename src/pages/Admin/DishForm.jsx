import { useRef, useState } from "react";
import { ImagePlus, Link2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Modal, Switch, VegMark } from "../../components/ui";
import { api } from "../../lib/api";
import { formatPrice } from "../../lib/format";
import { MAX_UPLOAD_MB, UPLOAD_PROVIDER, optimizedImage, uploadImage } from "../../lib/upload";
import { CATEGORIES } from "../../../shared/menu";

const EMPTY = { name: "", description: "", price: "", category: "biryani", isVeg: true, isAvailable: true, imageUrl: "" };

// Add or edit a dish, with a live preview of the storefront card
const DishForm = ({ food, onClose, onSaved, readOnly }) => {
    const [form, setForm] = useState(() => (food ? { ...food, price: String(food.price) } : EMPTY));
    const [source, setSource] = useState(UPLOAD_PROVIDER === "cloudinary" ? "upload" : "url");
    const [progress, setProgress] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef(null);

    const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const handleFile = async (file) => {
        if (!file) return;
        setError("");
        setProgress(0);
        try {
            const url = await uploadImage(file, setProgress);
            set("imageUrl", url);
            toast.success("Photo uploaded");
        } catch (err) {
            setError(err.message);
        } finally {
            setProgress(null);
        }
    };

    const save = async (e) => {
        e.preventDefault();
        setError("");
        const price = Number(form.price);
        if (!form.name.trim()) return setError("Give the dish a name.");
        if (!Number.isInteger(price) || price < 1) return setError("Price must be a whole number of rupees.");
        if (!form.imageUrl) return setError("Add a photo: upload one or paste an image link.");
        setSaving(true);
        try {
            const body = { ...form, price, name: form.name.trim(), description: form.description.trim() };
            const { food: saved } = food
                ? await api(`/foods/${food.id}`, { method: "PATCH", body })
                : await api("/foods", { method: "POST", body });
            toast.success(food ? `${saved.name} updated` : `${saved.name} added to the menu`);
            onSaved(saved);
        } catch (err) {
            setError(err.message);
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            size="lg"
            title={food ? `Edit ${food.name}` : "Add a dish"}
            footer={
                <>
                    <button type="button" className="btn btn-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" form="dish-form" className="btn btn-primary" disabled={saving || progress !== null || readOnly} title={readOnly ? "Read-only demo" : undefined}>
                        {saving && <span className="spinner" />}
                        {food ? "Save changes" : "Add to menu"}
                    </button>
                </>
            }
        >
            <form id="dish-form" className="dish-form" onSubmit={save} noValidate>
                <div className="dish-form-fields">
                    <div className="field">
                        <span className="field-label">Photo</span>
                        <div className="segmented dish-source" role="tablist" aria-label="Photo source">
                            <button type="button" role="tab" aria-selected={source === "upload"} onClick={() => setSource("upload")} disabled={UPLOAD_PROVIDER !== "cloudinary"} title={UPLOAD_PROVIDER !== "cloudinary" ? "Uploads are not configured" : undefined}>
                                <UploadCloud size={15} /> Upload
                            </button>
                            <button type="button" role="tab" aria-selected={source === "url"} onClick={() => setSource("url")}>
                                <Link2 size={15} /> Image link
                            </button>
                        </div>
                        {source === "upload" ? (
                            <div
                                className={`dropzone ${dragging ? "is-over" : ""}`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragging(true);
                                }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragging(false);
                                    handleFile(e.dataTransfer.files?.[0]);
                                }}
                            >
                                {progress !== null ? (
                                    <div className="dropzone-progress">
                                        <span className="spinner" />
                                        Uploading… {progress}%
                                        <div className="meter">
                                            <span style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <ImagePlus size={22} />
                                        <span>
                                            Drag a photo here or{" "}
                                            <button type="button" className="btn-text" onClick={() => fileRef.current?.click()}>
                                                browse
                                            </button>
                                        </span>
                                        <span className="subtle">JPG, PNG or WebP, up to {MAX_UPLOAD_MB} MB</span>
                                    </>
                                )}
                                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
                            </div>
                        ) : (
                            <input className="input" type="url" placeholder="https://… or /dishes/name.webp" value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} aria-label="Image link" />
                        )}
                    </div>

                    <div className="field">
                        <label htmlFor="dish-name">Name</label>
                        <input id="dish-name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Hyderabadi Chicken Dum Biryani" maxLength={80} />
                    </div>
                    <div className="field">
                        <label htmlFor="dish-desc">Description</label>
                        <textarea id="dish-desc" className="input" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What makes it special, what it's served with" maxLength={300} />
                        <span className="field-hint num">{form.description.length}/300</span>
                    </div>
                    <div className="dish-form-row">
                        <div className="field">
                            <label htmlFor="dish-price">Price (₹)</label>
                            <input id="dish-price" className="input num" inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))} placeholder="249" />
                        </div>
                        <div className="field">
                            <label htmlFor="dish-cat">Category</label>
                            <select id="dish-cat" className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>
                                {CATEGORIES.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="dish-form-row">
                        <div className="field">
                            <span className="field-label">Type</span>
                            <div className="segmented" role="group" aria-label="Veg or non-veg">
                                <button type="button" aria-pressed={form.isVeg} onClick={() => set("isVeg", true)}>
                                    <VegMark veg size={13} /> Veg
                                </button>
                                <button type="button" aria-pressed={!form.isVeg} onClick={() => set("isVeg", false)}>
                                    <VegMark veg={false} size={13} /> Non-veg
                                </button>
                            </div>
                        </div>
                        <div className="field">
                            <span className="field-label">Availability</span>
                            <label className="switch-row">
                                <Switch checked={form.isAvailable} onChange={(v) => set("isAvailable", v)} label="Available to order" />
                                {form.isAvailable ? "In stock" : "Sold out"}
                            </label>
                        </div>
                    </div>
                    {error && (
                        <p className="auth-error" role="alert">
                            {error}
                        </p>
                    )}
                </div>

                <aside className="dish-preview" aria-label="Preview">
                    <span className="eyebrow">Live preview</span>
                    <div className={`food-card ${form.isAvailable ? "" : "is-sold-out"}`}>
                        <div className="food-card-media">
                            {form.imageUrl ? <img src={optimizedImage(form.imageUrl, 480)} alt="" /> : <div className="dish-preview-ph"><ImagePlus size={28} /></div>}
                        </div>
                        <div className="food-card-body">
                            <div className="food-card-title">
                                <VegMark veg={form.isVeg} size={15} />
                                <h3>{form.name || "Dish name"}</h3>
                            </div>
                            <p>{form.description || "A short, tasty description shows here."}</p>
                            <div className="food-card-foot">
                                <span className="food-card-price num">{form.price ? formatPrice(Number(form.price)) : "₹–"}</span>
                                {form.isAvailable ? <span className="btn btn-soft btn-sm">+ Add</span> : <span className="sold-out-tag">Sold out</span>}
                            </div>
                        </div>
                    </div>
                </aside>
            </form>
        </Modal>
    );
};

export default DishForm;
