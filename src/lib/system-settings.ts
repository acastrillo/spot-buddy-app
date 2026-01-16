import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const SETTINGS_TABLE =
  process.env.DYNAMODB_SYSTEM_SETTINGS_TABLE || "spotter-system-settings";

const GLOBAL_BETA_ID = "global-beta-mode";
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface SystemSettingItem {
  id: string;
  value: boolean;
  type: "boolean";
  updatedAt: string;
  updatedBy: string;
  description?: string;
}

export interface SystemSettings {
  globalBetaMode: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

let settingsClient: DynamoDBDocumentClient | null = null;
let cachedGlobalBeta:
  | {
      value: boolean;
      updatedAt?: string | null;
      updatedBy?: string | null;
      fetchedAt: number;
    }
  | null = null;

function getSettingsClient(): DynamoDBDocumentClient {
  if (!settingsClient) {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
    settingsClient = DynamoDBDocumentClient.from(client);
  }
  return settingsClient;
}

function getDefaultGlobalBetaMode(): boolean {
  return process.env.NODE_ENV === "production";
}

export function clearSystemSettingsCache(): void {
  cachedGlobalBeta = null;
}

export async function getSystemSettings(options?: {
  bypassCache?: boolean;
}): Promise<SystemSettings> {
  const shouldBypassCache = options?.bypassCache === true;

  if (!shouldBypassCache && cachedGlobalBeta) {
    const ageMs = Date.now() - cachedGlobalBeta.fetchedAt;
    if (ageMs <= CACHE_TTL_MS) {
      return {
        globalBetaMode: cachedGlobalBeta.value,
        updatedAt: cachedGlobalBeta.updatedAt ?? null,
        updatedBy: cachedGlobalBeta.updatedBy ?? null,
      };
    }
  }

  try {
    const result = await getSettingsClient().send(
      new GetCommand({
        TableName: SETTINGS_TABLE,
        Key: { id: GLOBAL_BETA_ID },
      })
    );

    const item = result.Item as SystemSettingItem | undefined;
    if (!item) {
      const fallback = getDefaultGlobalBetaMode();
      cachedGlobalBeta = {
        value: fallback,
        updatedAt: null,
        updatedBy: null,
        fetchedAt: Date.now(),
      };
      return { globalBetaMode: fallback, updatedAt: null, updatedBy: null };
    }

    cachedGlobalBeta = {
      value: Boolean(item.value),
      updatedAt: item.updatedAt ?? null,
      updatedBy: item.updatedBy ?? null,
      fetchedAt: Date.now(),
    };

    return {
      globalBetaMode: Boolean(item.value),
      updatedAt: item.updatedAt ?? null,
      updatedBy: item.updatedBy ?? null,
    };
  } catch (error) {
    console.error("[SystemSettings] Failed to load global beta mode:", error);
    const fallback = getDefaultGlobalBetaMode();
    return { globalBetaMode: fallback, updatedAt: null, updatedBy: null };
  }
}

export async function setGlobalBetaMode(params: {
  value: boolean;
  updatedBy: string;
  description?: string;
}): Promise<SystemSettings> {
  const now = new Date().toISOString();
  const item: SystemSettingItem = {
    id: GLOBAL_BETA_ID,
    value: params.value,
    type: "boolean",
    updatedAt: now,
    updatedBy: params.updatedBy,
    description: params.description,
  };

  await getSettingsClient().send(
    new PutCommand({
      TableName: SETTINGS_TABLE,
      Item: item,
    })
  );

  cachedGlobalBeta = {
    value: item.value,
    updatedAt: item.updatedAt,
    updatedBy: item.updatedBy,
    fetchedAt: Date.now(),
  };

  return {
    globalBetaMode: item.value,
    updatedAt: item.updatedAt,
    updatedBy: item.updatedBy,
  };
}
