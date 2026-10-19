import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { db } from "./db.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

// Applies every migrations/*.sql file that has not run yet, in name order.
export const migrate = async ({ log = console.log } = {}) => {
    const sql = db();
    await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
    const done = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    let applied = 0;
    for (const file of files) {
        if (done.has(file)) continue;
        const text = await readFile(path.join(dir, file), "utf8");
        // The HTTP driver runs one statement per query, so split on semicolons at line ends
        const statements = text
            .split(/;\s*$/m)
            .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
            .filter(Boolean);
        await sql.transaction((tx) => [
            ...statements.map((s) => tx.query(s)),
            tx`insert into schema_migrations (name) values (${file})`,
        ]);
        log(`applied ${file}`);
        applied++;
    }
    if (!applied) log("database is up to date");
    return applied;
};
