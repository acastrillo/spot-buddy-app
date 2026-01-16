import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const AUDIT_TABLE = process.env.DYNAMODB_AUDIT_TABLE;

let auditClient: DynamoDBDocumentClient | null = null;

function getAuditClient(): DynamoDBDocumentClient {
  if (!auditClient) {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
    auditClient = DynamoDBDocumentClient.from(client);
  }
  return auditClient;
}

export type AuditAction =
  | "admin.reset-quotas"
  | "admin.view-users"
  | "admin.view-user-details"
  | "admin.export-users"
  | "admin.toggle-user-beta"
  | "admin.disable-account"
  | "admin.enable-account"
  | "admin.change-tier"
  | "admin.toggle-global-beta"
  | "admin.view-logs"
  | "admin.update-settings";

export async function writeAuditLog(entry: {
  action: AuditAction;
  actorId: string;
  actorEmail?: string | null;
  targetId?: string | null;
  targetEmail?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!AUDIT_TABLE) {
    console.warn("[Audit] DYNAMODB_AUDIT_TABLE not configured; audit entry skipped.", entry.action);
    return;
  }

  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    action: entry.action,
    actorId: entry.actorId,
    actorEmail: entry.actorEmail || null,
    targetId: entry.targetId || null,
    targetEmail: entry.targetEmail || null,
    ipAddress: entry.ipAddress || null,
    metadata: entry.metadata || {},
    createdAt: now,
  };

  try {
    await getAuditClient().send(
      new PutCommand({
        TableName: AUDIT_TABLE,
        Item: item,
      })
    );
  } catch (error) {
    console.error("[Audit] Failed to write audit log entry:", error);
  }
}
