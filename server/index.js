// Standalone API server (npm run api). `npm run dev` mounts the same app inside Vite instead.
import dotenv from "dotenv";
dotenv.config({ quiet: true });
import app from "./app.js";

const port = Number(process.env.API_PORT || 4000);
app.listen(port, () => console.log(`Zaika API on http://localhost:${port}/api/health`));
