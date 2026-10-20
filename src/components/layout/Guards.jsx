import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";

const Waiting = () => (
    <div className="route-wait" aria-busy="true" aria-label="Loading">
        <span className="spinner" />
    </div>
);

// Signed-in users only; everyone else goes to /login and comes back afterwards
export const RequireAuth = ({ children }) => {
    const { user, ready } = useAuth();
    const location = useLocation();
    if (!ready) return <Waiting />;
    if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    return children;
};

// Admins and the read-only demo admin
export const RequireStaff = ({ children }) => {
    const { user, ready, isStaff } = useAuth();
    const location = useLocation();
    if (!ready) return <Waiting />;
    if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    if (!isStaff) return <Navigate to="/" replace />;
    return children;
};

export const RouteFallback = Waiting;
