import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // Ready once we know whether a saved token is still valid
    const [ready, setReady] = useState(() => !getToken());

    useEffect(() => {
        if (!getToken()) return;
        const ctrl = new AbortController();
        api("/auth/me", { signal: ctrl.signal })
            .then(({ user }) => setUser(user))
            .catch(() => {})
            // An aborted check (StrictMode remount) must not mark auth ready without a user
            .finally(() => !ctrl.signal.aborted && setReady(true));
        return () => ctrl.abort();
    }, []);

    useEffect(() => {
        const onSignedOut = () => setUser(null);
        window.addEventListener("zaika:signed-out", onSignedOut);
        return () => window.removeEventListener("zaika:signed-out", onSignedOut);
    }, []);

    const finish = ({ token, user }) => {
        setToken(token);
        setUser(user);
        return user;
    };

    const login = useCallback((email, password) => api("/auth/login", { method: "POST", body: { email, password } }).then(finish), []);
    const register = useCallback((name, email, password) => api("/auth/register", { method: "POST", body: { name, email, password } }).then(finish), []);
    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
    }, []);
    const updateProfile = useCallback(async (patch) => {
        const { user } = await api("/auth/me", { method: "PATCH", body: patch });
        setUser(user);
        return user;
    }, []);

    const value = useMemo(
        () => ({
            user,
            ready,
            isStaff: user?.role === "admin" || user?.role === "demo_admin",
            isDemoAdmin: user?.role === "demo_admin",
            login,
            register,
            logout,
            updateProfile,
            setUser,
        }),
        [user, ready, login, register, logout, updateProfile],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- hook lives next to its provider
export const useAuth = () => useContext(AuthContext);
