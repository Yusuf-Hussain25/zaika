// Tiny JSON client for the Zaika API. Same origin in dev (Vite) and on Vercel.
const TOKEN_KEY = "zaika-token";

export const getToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

export const setToken = (token) => {
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    } catch {
        // private mode: the session lasts until the tab closes
    }
};

export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

export const api = async (path, { method = "GET", body, signal } = {}) => {
    const token = getToken();
    let res;
    try {
        res = await fetch(`/api${path}`, {
            method,
            signal,
            headers: {
                ...(body !== undefined ? { "content-type": "application/json" } : {}),
                ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch (err) {
        if (err.name === "AbortError") throw err;
        throw new ApiError(0, "Can't reach Zaika. Check your connection and try again.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        // A stale or revoked token: drop it so the app falls back to signed-out mode
        if (res.status === 401 && token) {
            setToken(null);
            window.dispatchEvent(new Event("zaika:signed-out"));
        }
        throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
    }
    return data;
};
