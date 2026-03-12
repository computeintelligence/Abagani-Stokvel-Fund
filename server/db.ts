import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export async function runMigrations() {
  const client = await pool.connect();
  try {
    const migrations = [
      `ALTER TABLE members ADD COLUMN IF NOT EXISTS next_of_kin_name TEXT`,
      `ALTER TABLE members ADD COLUMN IF NOT EXISTS next_of_kin_phone TEXT`,
      `ALTER TABLE members ADD COLUMN IF NOT EXISTS next_of_kin_relationship TEXT`,
      `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS next_of_kin_name TEXT`,
      `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS next_of_kin_phone TEXT`,
      `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS next_of_kin_relationship TEXT`,
      `ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS next_of_kin_name TEXT`,
      `ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS next_of_kin_phone TEXT`,
      `ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS next_of_kin_relationship TEXT`,
    ];
    for (const sql of migrations) {
      await client.query(sql);
    }
    console.log("Database migrations completed successfully");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    client.release();
  }
}
