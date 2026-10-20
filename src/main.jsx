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

// Installable app + offline shell. Production only, so the dev server is never cached.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
