import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { ENV_CONFIG } from "../env.config";
import Database from "better-sqlite3";

// Create the SQLite database instance
const sqlite = new Database(ENV_CONFIG.DATABASE_URL, {
  verbose: console.log,
});
sqlite.pragma("journal_mode = WAL");

// Ensure the database schema is created
sqlite.exec(`
 CREATE TABLE IF NOT EXISTS plans (
   id TEXT PRIMARY KEY,
   name TEXT,
   price REAL,
   billingCycle TEXT)
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    userId TEXT,
    teamId TEXT,
    planId TEXT,
    startDate TEXT,
    endDate TEXT,
    status TEXT,
    billingCycle TEXT
  )
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS subscriptionActivations (
    id TEXT PRIMARY KEY,
    orderId TEXT,
    subscriptionId TEXT,
    activationDate TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    userId TEXT,
    subscriptionId TEXT,
    amount REAL,
    currency TEXT,
    status TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )
`);

// Instantiate Drizzle ORM with SQLite connection and schema
const db = drizzle(sqlite, { schema });

export { db, schema };
export default db;
