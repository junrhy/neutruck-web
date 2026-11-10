import Database from "@tauri-apps/plugin-sql";

export interface DBConfig {
  isPg: boolean;
}

export function isPostgresTarget(dbTarget: string): boolean {
  return dbTarget.startsWith("postgres://") || dbTarget.startsWith("postgresql://");
}

/**
 * Converts standard $1, $2, $3 positional SQL query parameters to SQLite ? syntax
 * if the database target is SQLite.
 */
export function formatQuery(sql: string, isPg: boolean): string {
  if (isPg) return sql;
  
  // Replace $1, $2, $3... with ? for SQLite
  let formatted = sql.replace(/\$\d+/g, "?");

  // Remove `neutruck.` schema prefix for local SQLite
  formatted = formatted.replace(/\bneutruck\./gi, "");

  // Replace ILIKE with LIKE for SQLite
  formatted = formatted.replace(/\bILIKE\b/gi, "LIKE");

  // Replace CURRENT_TIMESTAMP WITH TIME ZONE with CURRENT_TIMESTAMP
  formatted = formatted.replace(/TIMESTAMP WITH TIME ZONE/gi, "DATETIME");

  return formatted;
}

export async function executeQuery(
  db: Database,
  isPg: boolean,
  sql: string,
  binds: any[] = []
): Promise<any> {
  const query = formatQuery(sql, isPg);
  return await db.execute(query, binds);
}

export async function selectQuery<T = any>(
  db: Database,
  isPg: boolean,
  sql: string,
  binds: any[] = []
): Promise<T[]> {
  const query = formatQuery(sql, isPg);
  return await db.select<T[]>(query, binds);
}
