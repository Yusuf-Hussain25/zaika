import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { ChefHat, LayoutDashboard, LogOut, Moon, Package, ShoppingBag, Sun, UserRound } from "lucide-react";
import Logo from "../ui/Logo";
import CustomiseSheet from "../food/CustomiseSheet";
import { Avatar } from "../ui";
import { useAuth } from "../../context/AuthContext";
import { useStore } from "../../context/StoreContext";
import { getTheme, toggleTheme } from "../../lib/theme";
import "./SiteLayout.css";

const AccountMenu = () => {
    const { user, isStaff, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [theme, setThemeState] = useState(getTheme);
    const ref = useRef(null);

    // Close on outside click, Esc, or picking a link
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("pointerdown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div className="account-menu" ref={ref}>
            <button type="button" className="account-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label="Account menu">
                <Avatar name={user.name} size={34} />
            </button>
            {open && (
                <div className="account-pop glass" role="menu" onClick={(e) => e.target.closest("a") && setOpen(false)}>
                    <div className="account-pop-head">
                        <Avatar name={user.name} size={40} />
                        <div>
                            <strong>{user.name}</strong>
                            <span>{user.email}</span>
                        </div>
                    </div>
                    <Link role="menuitem" to="/orders"><Package size={17} /> My orders</Link>
                    <Link role="menuitem" to="/account"><UserRound size={17} /> Account</Link>
                    {isStaff && <Link role="menuitem" to="/admin"><LayoutDashboard size={17} /> Admin panel</Link>}
                    <button role="menuitem" type="button" onClick={() => setThemeState(toggleTheme())}>
                        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                        {theme === "dark" ? "Light mode" : "Dark mode"}
                    </button>
                    <hr />
                    <button
                        role="menuitem"
                        type="button"
                        className="danger"
                        onClick={() => {
                            logout();
                            navigate("/");
                        }}
                    >
                        <LogOut size={17} /> Sign out
                    </button>
                </div>
            )}
        </div>
    );
};

const SiteHeader = () => {
    const { user, isStaff } = useAuth();
    const { count } = useStore();
    const { pathname, search } = useLocation();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
            <div className="container site-header-row">
                <Link to="/" aria-label="Zaika home">
                    <Logo size={32} />
                </Link>
                <nav className="site-nav" aria-label="Main">
                    <NavLink to="/" end>Menu</NavLink>
                    {user && <NavLink to="/orders">Orders</NavLink>}
                    {isStaff && (
                        <NavLink to="/admin">
                            <ChefHat size={15} /> Kitchen
                        </NavLink>
                    )}
                </nav>
                <div className="site-actions">
                    <Link to="/cart" className="icon-btn cart-btn" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
                        <ShoppingBag size={20} />
                        {count > 0 && <span className="badge-dot" key={count}>{count}</span>}
                    </Link>
                    {user ? (
                        <AccountMenu />
                    ) : (
                        <Link to={`/login?next=${encodeURIComponent(pathname + search)}`} className="btn btn-dark btn-sm">
                            Sign in
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
};

const SiteFooter = () => (
    <footer className="site-footer">
        <div className="container site-footer-row">
            <div className="site-footer-brand">
                <Logo size={28} />
                <p>Biryani, curries, dosas and street food from one kitchen, tracked from our stove to your door.</p>
            </div>
            <nav aria-label="Footer">
                <Link to="/">Menu</Link>
                <Link to="/cart">Cart</Link>
                <Link to="/orders">My orders</Link>
                <Link to="/account">Account</Link>
                <Link to="/admin">Admin panel</Link>
            </nav>
        </div>
        <div className="container site-footer-bottom">
            <span>© {new Date().getFullYear()} Zaika</span>
            <a href="https://github.com/Yusuf-Hussain25" target="_blank" rel="noreferrer">
                Built by Yusuf Hussain
            </a>
        </div>
    </footer>
);

const SiteLayout = () => {
    const { pathname } = useLocation();
    // New page, new scroll position (hash links on the home page handle their own)
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="site">
            <SiteHeader />
            <main className="site-main">
                <Outlet />
            </main>
            <SiteFooter />
            <CustomiseSheet />
        </div>
    );
};

export default SiteLayout;
