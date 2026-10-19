import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Serves the Express API (server/app.js) from the Vite dev server, so `npm run dev`
// starts the whole app on one port. Server files reload on save like the UI.
const zaikaApi = () => ({
    name: "zaika-api",
    configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
            if (!req.url.startsWith("/api/")) return next();
            try {
                const { default: app } = await server.ssrLoadModule("/server/app.js");
                app(req, res, next);
            } catch (err) {
                next(err);
            }
        });
    },
    async configurePreviewServer(server) {
        const { default: app } = await import("./server/app.js");
        server.middlewares.use((req, res, next) => (req.url.startsWith("/api/") ? app(req, res, next) : next()));
    },
});

export default defineConfig(({ mode }) => {
    // Make server-only values from .env (DATABASE_URL, JWT_SECRET, ...) visible to the API
    for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
        process.env[key] ??= value;
    }
    return {
        plugins: [react(), zaikaApi()],
        server: { port: 5173 },
    };
});
