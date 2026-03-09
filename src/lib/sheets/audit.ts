import { AuditLog } from "../domain/types";
import { appendRows } from "./client";
import { v4 as uuidv4 } from "uuid";

const SHEET = "AuditLog";

export async function logAuditEvent(
  accessToken: string,
  spreadsheetId: string,
  action: string,
  entity: string,
  entityId: string,
  user: string
): Promise<void> {
  const entry: AuditLog = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action,
    entity,
    entity_id: entityId,
    user,
  };

  await appendRows(accessToken, spreadsheetId, `${SHEET}!A:F`, [
    [entry.id, entry.timestamp, entry.action, entry.entity, entry.entity_id, entry.user],
  ]);
}
