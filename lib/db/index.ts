import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.POSTGRES_DB_URL!;

// Use a single connection for serverless — pool_mode=transaction on Supabase pooler
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
