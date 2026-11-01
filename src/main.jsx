import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
// Global tokens load before App so component CSS can override them
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { StoreProvider } from "./context/StoreContext.jsx";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <StoreProvider>
                    <App />
                </StoreProvider>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
);

// Wake the database quietly (Neon pauses after 5 idle minutes) so logging in and checking out
// don't wait on it. At most once every 4 minutes per tab.
try {
    const last = Number(sessionStorage.getItem("zaika-db-warm") || 0);
    if (Date.now() - last > 4 * 60 * 1000) {
        sessionStorage.setItem("zaika-db-warm", String(Date.now()));
        fetch("/api/warm", { cache: "no-store" }).catch(() => {});
    }
} catch {
    // Storage blocked (private mode): skip the warm-up, the first request wakes it instead
}

// Installable app + offline shell. Production only, so the dev server is never cached.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
