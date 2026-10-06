import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import pg from "pg";
import "dotenv/config";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const res = await client.query("SELECT 1");
console.log("Connected! Result:", res.rows);
await client.end();
