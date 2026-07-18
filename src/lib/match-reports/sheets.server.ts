/**
 * Server-only Google Sheets client for match reports.
 * Uses the Lovable connector gateway (google_sheets) — auth is set via
 * LOVABLE_API_KEY + GOOGLE_SHEETS_API_KEY env vars, injected server-side.
 *
 * NEVER import this file from a route or *.functions.ts module scope.
 */
import { SHEET_ID, SHEET_TAB } from "./schema";

const GATEWAY_BASE = "https://connector-gateway.lovable.dev/google_sheets/v4";

function authHeaders(): HeadersInit {
  const lovable = process.env.LOVABLE_API_KEY;
  const conn = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovable || !conn) {
    throw new Error("Google Sheets connector is not linked. Set LOVABLE_API_KEY and GOOGLE_SHEETS_API_KEY.");
  }
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": conn,
    "Content-Type": "application/json",
  };
}

async function gatewayFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${GATEWAY_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  return res;
}

/** Fetch all data rows (skips header). Returns raw string rows + first-row offset (2). */
export async function readAllRows(): Promise<{ rows: string[][]; firstDataRow: number }> {
  const range = `'${SHEET_TAB}'!A2:N`;
  const res = await gatewayFetch(
    `/spreadsheets/${SHEET_ID}/values/${encodeURI(range)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`,
  );
  if (!res.ok) {
    const body = await res.text();
    console.error(`[sheets] readAllRows failed [${res.status}]: ${body}`);
    throw new Error(`Google Sheets read failed [${res.status}]`);
  }
  const data = (await res.json()) as { values?: unknown[][] };
  const rows = (data.values ?? []).map((r) => r.map((c) => (c == null ? "" : String(c))));
  return { rows, firstDataRow: 2 };
}

/** Append one row to the sheet. Returns the resulting 1-based row index. */
export async function appendRow(values: (string | number)[]): Promise<number> {
  const range = `'${SHEET_TAB}'!A1`;
  const res = await gatewayFetch(
    `/spreadsheets/${SHEET_ID}/values/${encodeURI(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&includeValuesInResponse=false`,
    {
      method: "POST",
      body: JSON.stringify({ values: [values] }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    console.error(`[sheets] appendRow failed [${res.status}]: ${body}`);
    throw new Error(`Google Sheets append failed [${res.status}]`);
  }
  const data = (await res.json()) as { updates?: { updatedRange?: string } };
  const updated = data.updates?.updatedRange ?? "";
  // e.g. "'GKHQ Propietry Data Hub'!A6:N6"
  const m = updated.match(/![A-Z]+(\d+):[A-Z]+\d+$/);
  return m ? Number(m[1]) : -1;
}
