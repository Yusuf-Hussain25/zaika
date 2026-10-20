import { NavLink, useLocation } from "react-router";
import { House, Package, Search, ShoppingBag, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useStore } from "../../context/StoreContext";
import { useTransitionClick } from "../../lib/viewTransition";

// Phone navigation (under 640px): thumb-reachable tabs like a native app
const TabBar = () => {
    const { user } = useAuth();
    const { count } = useStore();
    const { pathname } = useLocation();
    const go = useTransitionClick();
    const account = user ? "/account" : `/login?next=${encodeURIComponent(pathname)}`;

    const tab = (to, Icon, label, { end = false, badge } = {}) => (
        <NavLink to={to} end={end} className="tab" onClick={go(to)} aria-label={badge ? `${label}, ${badge} item${badge === 1 ? "" : "s"}` : undefined}>
            <span className="tab-icon">
                <Icon size={22} strokeWidth={2} />
                {badge > 0 && (
                    <span className="badge-dot" key={badge}>
                        {badge}
                    </span>
                )}
            </span>
            <span className="tab-label">{label}</span>
        </NavLink>
    );

    return (
        <nav className="tab-bar" aria-label="App">
            {tab("/", House, "Home", { end: true })}
            {/* Opens the menu with its search box focused */}
            <NavLink to="/" className={() => "tab tab-search"} onClick={(e) => go("/", { state: { focusSearch: Date.now() } })(e)}>
                <span className="tab-icon">
                    <Search size={22} strokeWidth={2} />
                </span>
                <span className="tab-label">Search</span>
            </NavLink>
            {tab("/cart", ShoppingBag, "Cart", { badge: count })}
            {tab("/orders", Package, "Orders")}
            {tab(account, UserRound, user ? "Account" : "Sign in")}
        </nav>
    );
};

export default TabBar;
