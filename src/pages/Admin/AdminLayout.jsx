import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { ClipboardList, Eye, LayoutDashboard, LogOut, Menu as MenuIcon, Moon, Settings, Store, Sun, UsersRound, UtensilsCrossed } from "lucide-react";
import Logo from "../../components/ui/Logo";
import { Avatar, Drawer } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useStore } from "../../context/StoreContext";
import { getTheme, toggleTheme } from "../../lib/theme";
import { AdminDataProvider, useAdminData } from "./AdminData";
import "./Admin.css";

const NAV = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/orders", label: "Orders", icon: ClipboardList, badge: true },
    { to: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
    { to: "/admin/customers", label: "Customers", icon: UsersRound },
    { to: "/admin/settings", label: "Settings", icon: Settings },
];

const SidebarContent = ({ onNavigate }) => {
    const { user, logout } = useAuth();
    const { settings } = useStore();
    const { active } = useAdminData();
    const navigate = useNavigate();
    const [theme, setThemeState] = useState(getTheme);
    const waiting = active?.filter((o) => o.status === "placed").length ?? 0;

    return (
        <div className="admin-side-inner">
            <Link to="/admin" className="admin-brand" onClick={onNavigate} aria-label="Zaika kitchen dashboard">
                <Logo size={30} suffix="Kitchen" />
            </Link>

            <nav className="admin-nav" aria-label="Admin">
                {NAV.map(({ to, label, icon: Icon, end, badge }) => (
                    <NavLink key={to} to={to} end={end} onClick={onNavigate}>
                        <Icon size={19} />
                        <span>{label}</span>
                        {badge && active && active.length > 0 && (
                            <span className={`admin-nav-badge ${waiting ? "hot" : ""}`} title={`${active.length} active, ${waiting} waiting`}>
                                {active.length}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="admin-side-foot">
                {settings && (
                    <Link to="/admin/settings" className={`admin-store-state ${settings.storeOpen ? "open" : "closed"}`} onClick={onNavigate}>
                        <Store size={16} />
                        <span>{settings.storeOpen ? "Kitchen open" : "Kitchen closed"}</span>
                        <span className="live-dot" />
                    </Link>
                )}
                <Link to="/" className="admin-side-link" onClick={onNavigate}>
                    <Eye size={17} /> View storefront
                </Link>
                <button type="button" className="admin-side-link" onClick={() => setThemeState(toggleTheme())}>
                    {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />} {theme === "dark" ? "Light mode" : "Dark mode"}
                </button>
                <div className="admin-user">
                    <Avatar name={user.name} size={36} />
                    <div>
                        <strong>{user.name}</strong>
                        <span>{user.role === "demo_admin" ? "Demo admin · read-only" : "Admin"}</span>
                    </div>
                    <button
                        type="button"
                        className="icon-btn sm"
                        aria-label="Sign out"
                        onClick={() => {
                            logout();
                            navigate("/");
                        }}
                    >
                        <LogOut size={17} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminShell = () => {
    const { isDemoAdmin } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <div className="admin">
            <aside className="admin-side">
                <SidebarContent />
            </aside>
            <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" side="left">
                <SidebarContent onNavigate={() => setMenuOpen(false)} />
            </Drawer>
            <div className="admin-main">
                <header className="admin-topbar">
                    <button type="button" className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open admin menu">
                        <MenuIcon size={21} />
                    </button>
                    <Link to="/admin" aria-label="Zaika kitchen dashboard">
                        <Logo size={28} suffix="Kitchen" />
                    </Link>
                </header>
                {isDemoAdmin && (
                    <div className="demo-banner" role="status">
                        <Eye size={16} />
                        <span>
                            <strong>Read-only demo.</strong> Explore everything; changes are disabled and customer contact details are masked.
                        </span>
                    </div>
                )}
                <div className="admin-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

const AdminLayout = () => (
    <AdminDataProvider>
        <AdminShell />
    </AdminDataProvider>
);

export default AdminLayout;
