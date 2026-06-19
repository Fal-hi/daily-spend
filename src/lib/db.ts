import Database from "@tauri-apps/plugin-sql";

let dbInstance: Database | null = null;
let dbError: string | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (dbError) throw new Error(dbError);

  try {
    dbInstance = await Database.load("sqlite:daily_spend.db");
    dbError = null;
    return dbInstance;
  } catch (e: any) {
    const msg = e?.message || e?.toString() || "Unknown error";
    console.error("Database connection error:", e);
    dbError = msg;
    throw new Error(`Gagal terhubung ke database: ${msg}`);
  }
}

export function getDbError(): string | null {
  return dbError;
}

export async function resetDbConnection(): Promise<void> {
  dbInstance = null;
  dbError = null;
}
