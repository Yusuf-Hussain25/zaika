// npm run migrate: creates or updates the database tables
import "dotenv/config";
import { migrate } from "../server/migrate.js";

try {
    await migrate();
} catch (err) {
    console.error(`Migration failed: ${err.message}`);
    process.exit(1);
}
