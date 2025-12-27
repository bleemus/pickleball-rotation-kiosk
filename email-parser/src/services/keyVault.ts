import { SecretClient } from "@azure/keyvault-secrets";
import { ClientSecretCredential } from "@azure/identity";

/**
 * Configuration loaded from Azure Key Vault with .env fallback
 */
export interface EmailParserConfig {
  // Microsoft Graph API configuration
  graphTenantId?: string;
  graphClientId?: string;
  graphClientSecret?: string;
  graphUserId?: string;
}

/**
 * Maps Key Vault secret names (kebab-case) to config property names (camelCase)
 */
const SECRET_MAPPING: Record<string, keyof EmailParserConfig> = {
  "graph-tenant-id": "graphTenantId",
  "graph-client-id": "graphClientId",
  "graph-client-secret": "graphClientSecret",
  "graph-user-id": "graphUserId",
};

/**
 * Loads configuration from Azure Key Vault with fallback to environment variables.
 *
 * Key Vault credentials are read from environment variables:
 * - AZURE_TENANT_ID
 * - AZURE_CLIENT_ID
 * - AZURE_CLIENT_SECRET
 * - AZURE_KEYVAULT_URL
 *
 * If Key Vault is not configured or unavailable, falls back to:
 * - GRAPH_TENANT_ID
 * - GRAPH_CLIENT_ID
 * - GRAPH_CLIENT_SECRET
 * - GRAPH_USER_ID
 */
export async function loadConfig(): Promise<EmailParserConfig> {
  const config: EmailParserConfig = {};

  // Check if Key Vault is configured
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const vaultUrl = process.env.AZURE_KEYVAULT_URL;

  if (tenantId && clientId && clientSecret && vaultUrl) {
    try {
      console.log("🔐 Loading configuration from Azure Key Vault...");

      const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
      const client = new SecretClient(vaultUrl, credential);

      // Fetch all configured secrets
      for (const [secretName, configKey] of Object.entries(SECRET_MAPPING)) {
        try {
          const secret = await client.getSecret(secretName);
          if (secret.value) {
            config[configKey] = secret.value;
            console.log(`  ✅ Loaded secret: ${secretName}`);
          }
        } catch (error: unknown) {
          // Secret might not exist - that's OK for optional secrets
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("SecretNotFound")) {
            console.log(`  ⚠️  Secret not found: ${secretName}`);
          } else {
            console.warn(`  ⚠️  Failed to load secret ${secretName}:`, errorMessage);
          }
        }
      }

      console.log("🔐 Key Vault configuration loaded successfully");
    } catch (error) {
      console.warn(
        "⚠️  Failed to connect to Azure Key Vault, falling back to environment variables"
      );
      console.warn("   Error:", error instanceof Error ? error.message : String(error));
      return loadFromEnv();
    }
  } else {
    console.log("📋 Azure Key Vault not configured, using environment variables");
    return loadFromEnv();
  }

  // Merge with env vars as fallback for any missing values
  return mergeWithEnvFallback(config);
}

/**
 * Loads configuration purely from environment variables
 */
function loadFromEnv(): EmailParserConfig {
  return {
    graphTenantId: process.env.GRAPH_TENANT_ID,
    graphClientId: process.env.GRAPH_CLIENT_ID,
    graphClientSecret: process.env.GRAPH_CLIENT_SECRET,
    graphUserId: process.env.GRAPH_USER_ID,
  };
}

/**
 * Merges Key Vault config with environment variable fallbacks
 */
function mergeWithEnvFallback(config: EmailParserConfig): EmailParserConfig {
  return {
    graphTenantId: config.graphTenantId ?? process.env.GRAPH_TENANT_ID,
    graphClientId: config.graphClientId ?? process.env.GRAPH_CLIENT_ID,
    graphClientSecret: config.graphClientSecret ?? process.env.GRAPH_CLIENT_SECRET,
    graphUserId: config.graphUserId ?? process.env.GRAPH_USER_ID,
  };
}

// Singleton config instance
let appConfig: EmailParserConfig | null = null;

/**
 * Gets the application configuration, loading it if necessary.
 * This should be called after loadConfig() has been awaited during startup.
 */
export function getConfig(): EmailParserConfig {
  if (!appConfig) {
    throw new Error("Configuration not loaded. Call initConfig() during startup.");
  }
  return appConfig;
}

/**
 * Initializes and caches the application configuration.
 * Call this during server startup.
 */
export async function initConfig(): Promise<EmailParserConfig> {
  appConfig = await loadConfig();
  return appConfig;
}
