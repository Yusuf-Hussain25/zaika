import net from "node:net";
import { neon, neonConfig } from "@neondatabase/serverless";

// Node tries each IP for only 250ms before moving on, which is shorter than a round trip
// from India to a US Neon region, so every attempt timed out. Give each address 2s.
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

// Retry only when the connection itself failed: the query never reached Postgres, so it is
// safe to send again. Smooths over brief network blips and Neon waking from sleep.
const CONNECT_ERRORS = new Set(["ETIMEDOUT", "ENETUNREACH", "ECONNREFUSED", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"]);
neonConfig.fetchFunction = async (url, init) => {
    for (let attempt = 0; ; attempt++) {
        try {
            return await fetch(url, init);
        } catch (err) {
            if (attempt >= 2 || !CONNECT_ERRORS.has(err.cause?.code)) throw err;
            await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        }
    }
};

let client;

// Lazily created so a missing DATABASE_URL fails with a readable error on the
// first request instead of crashing the dev server at import time.
export const db = () => {
    if (!client) {
        const url = process.env.DATABASE_URL;
        if (!url) {
            throw Object.assign(new Error("DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string."), { status: 500, expose: true });
        }
        client = neon(url);
    }
    return client;
};

// Tagged-template helper: sql`select ... where id = ${id}`
export const sql = (strings, ...values) => db()(strings, ...values);

// Parameterised text query for dynamic WHERE clauses: query("... $1", [x])
export const query = (text, params = []) => db().query(text, params);

// Runs several queries atomically (Neon HTTP transactions are non-interactive)
export const transaction = (build) => db().transaction((tx) => build(tx));
