import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChefHat, LogOut, MapPin, Moon, Package, Sun, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/format";
import { getTheme, setTheme } from "../../lib/theme";
import "../Cart/Cart.css";
import "../Checkout/Checkout.css";
import "./Account.css";

const ADDRESS_FIELDS = [
    { key: "name", label: "Name on the door", autoComplete: "name" },
    { key: "phone", label: "Phone", autoComplete: "tel", inputMode: "tel" },
    { key: "line1", label: "Flat, building, street", autoComplete: "street-address", wide: true },
    { key: "landmark", label: "Landmark (optional)", wide: true },
    { key: "city", label: "City", autoComplete: "address-level2" },
    { key: "pincode", label: "PIN code", autoComplete: "postal-code", inputMode: "numeric", maxLength: 6 },
];

const Account = () => {
    const { user, isStaff, updateProfile, logout } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState({ name: user.name, phone: user.phone ?? "" });
    const [address, setAddress] = useState(() => ({ name: user.name, phone: user.phone ?? "", line1: "", landmark: "", city: "", pincode: "", ...(user.address ?? {}) }));
    const [saving, setSaving] = useState(null);
    const [theme, setThemeState] = useState(getTheme);

    const save = async (what, patch) => {
        setSaving(what);
        try {
            await updateProfile(patch);
            toast.success(what === "profile" ? "Profile saved" : "Address saved for checkout");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(null);
        }
    };

    const chooseTheme = (t) => {
        setTheme(t);
        setThemeState(t);
    };

    return (
        <div className="container page account">
            <div className="account-hero card">
                <Avatar name={user.name} size={64} />
                <div>
                    <h1>{user.name}</h1>
                    <p className="muted">
                        {user.email} · member since {formatDate(user.createdAt)}
                    </p>
                </div>
                <div className="account-links">
                    <Link to="/orders" className="btn btn-ghost btn-sm">
                        <Package size={16} /> My orders
                    </Link>
                    {isStaff && (
                        <Link to="/admin" className="btn btn-soft btn-sm">
                            <ChefHat size={16} /> Kitchen
                        </Link>
                    )}
                </div>
            </div>

            <div className="account-grid">
                <form
                    className="card checkout-section"
                    onSubmit={(e) => {
                        e.preventDefault();
                        save("profile", { name: profile.name, phone: profile.phone || null });
                    }}
                >
                    <h2>
                        <UserRound size={19} /> Profile
                    </h2>
                    <div className="field">
                        <label htmlFor="acc-name">Full name</label>
                        <input id="acc-name" className="input" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} autoComplete="name" minLength={2} required />
                    </div>
                    <div className="field">
                        <label htmlFor="acc-phone">Phone</label>
                        <input id="acc-phone" className="input" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" />
                    </div>
                    <div className="field">
                        <span className="field-label">Appearance</span>
                        <div className="segmented" role="group" aria-label="Theme">
                            <button type="button" aria-pressed={theme === "light"} onClick={() => chooseTheme("light")}>
                                <Sun size={15} /> Light
                            </button>
                            <button type="button" aria-pressed={theme === "dark"} onClick={() => chooseTheme("dark")}>
                                <Moon size={15} /> Dark
                            </button>
                        </div>
                    </div>
                    <div className="account-actions">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => {
                                logout();
                                navigate("/");
                            }}
                        >
                            <LogOut size={16} /> Sign out
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving === "profile" || (profile.name === user.name && profile.phone === (user.phone ?? ""))}>
                            {saving === "profile" && <span className="spinner" />} Save profile
                        </button>
                    </div>
                </form>

                <form
                    className="card checkout-section"
                    onSubmit={(e) => {
                        e.preventDefault();
                        save("address", { address: { ...address, landmark: address.landmark || null } });
                    }}
                >
                    <h2>
                        <MapPin size={19} /> Delivery address
                    </h2>
                    <p className="field-hint">Used to prefill checkout. You can change it on every order.</p>
                    <div className="checkout-grid">
                        {ADDRESS_FIELDS.map((f) => (
                            <div key={f.key} className={`field ${f.wide ? "wide" : ""}`}>
                                <label htmlFor={`acc-${f.key}`}>{f.label}</label>
                                <input
                                    id={`acc-${f.key}`}
                                    className="input"
                                    value={address[f.key] ?? ""}
                                    onChange={(e) => setAddress((a) => ({ ...a, [f.key]: e.target.value }))}
                                    autoComplete={f.autoComplete}
                                    inputMode={f.inputMode}
                                    maxLength={f.maxLength}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="account-actions">
                        <button type="submit" className="btn btn-primary" disabled={saving === "address"}>
                            {saving === "address" && <span className="spinner" />} Save address
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Account;
