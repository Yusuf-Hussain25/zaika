import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, ArrowRight, ChefHat, Eye, EyeOff, Leaf, Lock, Mail, Timer, UserRound, Wallet } from "lucide-react";
import { toast } from "sonner";
import Logo from "../../components/ui/Logo";
import { VegMark } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useStore } from "../../context/StoreContext";
import { formatPrice } from "../../lib/format";
import { optimizedImage } from "../../lib/upload";
import "./Auth.css";

const DEMO = {
    email: import.meta.env.VITE_DEMO_EMAIL,
    password: import.meta.env.VITE_DEMO_PASSWORD,
};
const DEMO_ADMIN = {
    email: import.meta.env.VITE_DEMO_ADMIN_EMAIL,
    password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD,
};

const FEATURES = [
    { icon: Timer, title: "Live tracking", text: "Follow every order from our stove to your door." },
    { icon: Leaf, title: "Veg first", text: "Clear veg and non-veg marks, plus a veg-only filter." },
    { icon: Wallet, title: "Pay your way", text: "Cash on delivery or card, with a clear bill." },
];

// Real bestsellers from the live menu, so the preview always matches the kitchen
const MenuPreview = () => {
    const { foods, foodsState, settings } = useStore();
    const picks = useMemo(() => {
        const ranked = [...foods].filter((f) => f.isAvailable).sort((a, b) => b.orderCount - a.orderCount);
        return ranked.slice(0, 3);
    }, [foods]);

    return (
        <div className="auth-preview glass" aria-label="Tonight's bestsellers">
            <div className="auth-preview-head">
                <span className="eyebrow">Tonight&apos;s bestsellers</span>
                {settings && (
                    <span className={`chip ${settings.storeOpen ? "chip-success" : "chip-danger"}`}>
                        <span className="live-dot" />
                        {settings.storeOpen ? `Delivering in ~${settings.etaMinutes} min` : "Kitchen closed"}
                    </span>
                )}
            </div>
            <ul>
                {foodsState === "loading" &&
                    [0, 1, 2].map((i) => (
                        <li key={i}>
                            <span className="skeleton" style={{ width: 52, height: 52, borderRadius: 14 }} />
                            <span style={{ flex: 1, display: "grid", gap: 6 }}>
                                <span className="skeleton" style={{ height: 12, width: "70%" }} />
                                <span className="skeleton" style={{ height: 10, width: "40%" }} />
                            </span>
                        </li>
                    ))}
                {picks.map((f) => (
                    <li key={f.id}>
                        <img src={optimizedImage(f.imageUrl, 120)} alt="" loading="lazy" />
                        <span className="auth-preview-info">
                            <strong>
                                <VegMark veg={f.isVeg} size={13} /> {f.name}
                            </strong>
                            <span>{f.orderCount ? `${f.orderCount} ordered this month` : "Fresh on the menu"}</span>
                        </span>
                        <span className="auth-preview-price num">{formatPrice(f.price)}</span>
                    </li>
                ))}
                {foodsState === "ready" && !picks.length && <li className="muted">The menu is being prepared.</li>}
            </ul>
            {settings && settings.freeDeliveryOver > 0 && (
                <p className="auth-preview-foot">Free delivery on orders over {formatPrice(settings.freeDeliveryOver)}</p>
            )}
        </div>
    );
};

const Auth = () => {
    const { user, ready, login, register } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = params.get("next")?.startsWith("/") ? params.get("next") : "/";
    const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login");
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(null); // "form" | "demo" | "demo-admin"
    const [error, setError] = useState("");

    if (ready && user && !busy) return <Navigate to={next} replace />;

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const done = (u, target = next) => {
        toast.success(`Welcome${mode === "signup" ? "" : " back"}, ${u.name.split(" ")[0]}!`);
        navigate(target, { replace: true });
    };

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy("form");
        try {
            const u = mode === "signup" ? await register(form.name, form.email, form.password) : await login(form.email, form.password);
            done(u);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(null);
        }
    };

    const demoLogin = async (account, kind, target) => {
        setError("");
        setBusy(kind);
        try {
            done(await login(account.email, account.password), target);
        } catch (err) {
            setError(err.status === 401 ? "The demo account isn't set up yet. Run `npm run seed` first." : err.message);
        } finally {
            setBusy(null);
        }
    };

    const switchMode = (m) => {
        setMode(m);
        setError("");
    };

    return (
        <div className="auth">
            <section className="auth-hero">
                <Link to="/" className="auth-logo" aria-label="Zaika home">
                    <Logo size={34} />
                </Link>
                <div className="auth-hero-copy fade-up">
                    <span className="eyebrow">Real Indian flavour</span>
                    <h1>
                        Dum biryani, dosas and chaat, <span className="gradient-text">delivered hot.</span>
                    </h1>
                    <p>One kitchen, cooked to order. Sign in to save your address, reorder favourites in a tap and track every order live.</p>
                </div>
                <MenuPreview />
                <ul className="auth-features">
                    {FEATURES.map(({ icon: Icon, title, text }) => (
                        <li key={title}>
                            <span className="auth-feature-icon">
                                <Icon size={18} />
                            </span>
                            <strong>{title}</strong>
                            <span>{text}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="auth-panel">
                <Link to={next} className="btn btn-ghost btn-sm auth-back">
                    <ArrowLeft size={16} /> Back to {next === "/" ? "menu" : "Zaika"}
                </Link>
                <div className="auth-card glass fade-up">
                    <div className="auth-card-head">
                        <h2>{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
                        <p>{mode === "signup" ? "It takes 20 seconds. No spam, ever." : "Log in to order, track and reorder."}</p>
                    </div>

                    <div className="segmented auth-switch" role="tablist" aria-label="Log in or sign up">
                        <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => switchMode("login")}>
                            Log in
                        </button>
                        <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => switchMode("signup")}>
                            Sign up
                        </button>
                    </div>

                    <form onSubmit={submit} className="auth-form" noValidate>
                        {mode === "signup" && (
                            <div className="field">
                                <label htmlFor="auth-name">Full name</label>
                                <div className="input-wrap">
                                    <UserRound size={18} />
                                    <input id="auth-name" className="input" value={form.name} onChange={set("name")} placeholder="Aarav Sharma" autoComplete="name" required minLength={2} />
                                </div>
                            </div>
                        )}
                        <div className="field">
                            <label htmlFor="auth-email">Email</label>
                            <div className="input-wrap">
                                <Mail size={18} />
                                <input id="auth-email" type="email" className="input" value={form.email} onChange={set("email")} placeholder="you@example.com" autoComplete="email" required />
                            </div>
                        </div>
                        <div className="field">
                            <label htmlFor="auth-password">Password</label>
                            <div className="input-wrap">
                                <Lock size={18} />
                                <input
                                    id="auth-password"
                                    type={showPassword ? "text" : "password"}
                                    className="input"
                                    value={form.password}
                                    onChange={set("password")}
                                    placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                                    required
                                    minLength={8}
                                />
                                <button type="button" className="icon-btn sm input-action" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? "Hide password" : "Show password"}>
                                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="auth-error" role="alert">
                                {error}
                            </p>
                        )}

                        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={Boolean(busy)}>
                            {busy === "form" ? <span className="spinner" /> : null}
                            {mode === "signup" ? "Create account" : "Log in"}
                            {busy !== "form" && <ArrowRight size={18} />}
                        </button>
                    </form>

                    {(DEMO.email || DEMO_ADMIN.email) && (
                        <>
                            <div className="divider">or explore first</div>
                            <div className="auth-demo">
                                {DEMO.email && (
                                    <button type="button" className="btn btn-ghost btn-block" disabled={Boolean(busy)} onClick={() => demoLogin(DEMO, "demo")}>
                                        {busy === "demo" ? <span className="spinner" /> : <UserRound size={17} />}
                                        Explore with a demo account
                                    </button>
                                )}
                                {DEMO_ADMIN.email && (
                                    <button type="button" className="btn btn-soft btn-block" disabled={Boolean(busy)} onClick={() => demoLogin(DEMO_ADMIN, "demo-admin", "/admin")}>
                                        {busy === "demo-admin" ? <span className="spinner" /> : <ChefHat size={17} />}
                                        Explore the admin panel <span className="auth-demo-tag">read-only</span>
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <p className="auth-legal">By continuing you agree to enjoy great food responsibly.</p>
            </section>
        </div>
    );
};

export default Auth;
