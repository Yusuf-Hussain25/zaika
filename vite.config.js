import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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

// Writes the built chunk list and a content version into dist/sw.js, so the service worker
// precaches every page (including lazy ones) and drops old caches after each deploy
const swAssets = () => {
    let files = [];
    let outDir = "dist";
    return {
        name: "zaika-sw-assets",
        apply: "build",
        configResolved(config) {
            outDir = path.resolve(config.root, config.build.outDir);
        },
        generateBundle(_options, bundle) {
            files = Object.keys(bundle).filter((f) => /^assets\/.+\.(js|css)$/.test(f)).sort();
        },
        async closeBundle() {
            const file = path.join(outDir, "sw.js");
            const assets = files.map((f) => `/${f}`);
            const source = await readFile(file, "utf8");
            const version = createHash("sha256").update(assets.join() + source).digest("hex").slice(0, 10);
            await writeFile(file, source.replace(/const BUILD = \{[^}]*\};/, `const BUILD = ${JSON.stringify({ version, assets })};`));
        },
    };
};

export default defineConfig(({ mode }) => {
    // Make server-only values from .env (DATABASE_URL, JWT_SECRET, ...) visible to the API
    for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
        process.env[key] ??= value;
    }
    return {
        plugins: [react(), zaikaApi(), swAssets()],
        server: { port: 5173 },
    };
});
