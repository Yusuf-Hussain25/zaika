import { useState } from "react";
import { Bike, Clock3, IndianRupee, Store } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useStore } from "../../context/StoreContext";
import { api } from "../../lib/api";
import { formatPrice, timeAgo } from "../../lib/format";

const NUMBER_FIELDS = [
    { key: "deliveryFee", label: "Delivery fee", icon: IndianRupee, suffix: "₹", hint: "Charged on orders below the free-delivery amount", max: 500 },
    { key: "freeDeliveryOver", label: "Free delivery over", icon: Bike, suffix: "₹", hint: "Set to 0 to always deliver free", max: 10000 },
    { key: "etaMinutes", label: "Delivery time", icon: Clock3, suffix: "min", hint: "Shown on the storefront and used for arrival estimates", min: 10, max: 180 },
];

const SettingsForm = ({ settings, readOnly, onSaved }) => {
    const [draft, setDraft] = useState(() => ({
        deliveryFee: String(settings.deliveryFee),
        freeDeliveryOver: String(settings.freeDeliveryOver),
        etaMinutes: String(settings.etaMinutes),
    }));
    const [saving, setSaving] = useState(null);
    const dirty = NUMBER_FIELDS.some((f) => Number(draft[f.key]) !== settings[f.key]);

    const save = async (patch, what) => {
        setSaving(what);
        try {
            const { settings: next } = await api("/settings", { method: "PATCH", body: patch });
            onSaved(next);
            return next;
        } catch (err) {
            toast.error(err.message);
            return null;
        } finally {
            setSaving(null);
        }
    };

    const toggleOpen = async (open) => {
        if (await save({ storeOpen: open }, "open")) toast.success(open ? "Kitchen is open. Customers can order." : "Kitchen closed. Checkout is paused.");
    };

    const submit = async (e) => {
        e.preventDefault();
        const patch = Object.fromEntries(NUMBER_FIELDS.map((f) => [f.key, Number(draft[f.key])]));
        if (await save(patch, "numbers")) toast.success("Delivery settings saved");
    };

    return (
        <div className="settings-grid">
            <section className={`card settings-open ${settings.storeOpen ? "is-open" : ""}`}>
                <span className="settings-open-icon">
                    <Store size={24} />
                </span>
                <div>
                    <h2>{settings.storeOpen ? "The kitchen is open" : "The kitchen is closed"}</h2>
                    <p>{settings.storeOpen ? "Customers can place orders right now." : "The storefront shows a closed banner and checkout is paused. Carts are kept."}</p>
                    <span className="subtle">Last changed {timeAgo(settings.updatedAt)}</span>
                </div>
                <label className="switch-row settings-switch">
                    {saving === "open" && <span className="spinner" />}
                    <Switch checked={settings.storeOpen} onChange={toggleOpen} label="Kitchen open" disabled={readOnly || Boolean(saving)} />
                </label>
            </section>

            <form className="card settings-form" onSubmit={submit}>
                <h2>Delivery</h2>
                {NUMBER_FIELDS.map(({ key, label, icon: Icon, suffix, hint, min = 0, max }) => (
                    <div key={key} className="field">
                        <label htmlFor={`set-${key}`}>
                            <Icon size={15} /> {label}
                        </label>
                        <div className="input-suffix">
                            <input
                                id={`set-${key}`}
                                className="input num"
                                inputMode="numeric"
                                value={draft[key]}
                                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value.replace(/\D/g, "") }))}
                                disabled={readOnly}
                                aria-describedby={`set-${key}-hint`}
                                min={min}
                                max={max}
                            />
                            <span>{suffix}</span>
                        </div>
                        <span id={`set-${key}-hint`} className="field-hint">
                            {hint}
                        </span>
                    </div>
                ))}
                <p className="settings-preview">
                    Customers will see: <strong>{Number(draft.freeDeliveryOver) > 0 ? `Free delivery over ${formatPrice(Number(draft.freeDeliveryOver))}` : "Free delivery on every order"}</strong>
                    {Number(draft.freeDeliveryOver) > 0 && <> · {formatPrice(Number(draft.deliveryFee))} fee below that</>} · delivering in ~{draft.etaMinutes || "–"} min
                </p>
                <div className="settings-actions">
                    <button type="submit" className="btn btn-primary" disabled={readOnly || !dirty || Boolean(saving)} title={readOnly ? "Read-only demo" : undefined}>
                        {saving === "numbers" && <span className="spinner" />} Save changes
                    </button>
                </div>
            </form>
        </div>
    );
};

const StoreSettings = () => {
    const { isDemoAdmin } = useAuth();
    const { settings, setSettings } = useStore();
    return (
        <div className="admin-page">
            <div className="page-head">
                <div>
                    <span className="eyebrow">Settings</span>
                    <h1>Store settings</h1>
                    <p>Everything here changes the live storefront immediately.</p>
                </div>
            </div>
            {settings ? <SettingsForm settings={settings} readOnly={isDemoAdmin} onSaved={setSettings} /> : <div className="skeleton" style={{ height: 260, borderRadius: 22 }} />}
        </div>
    );
};

export default StoreSettings;
