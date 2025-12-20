import { createClient, RedisClientType } from "redis";
import { Session } from "../types/game";

let redisClient: RedisClientType | null = null;

export async function initRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  redisClient = createClient({
    url: redisUrl,
  });

  redisClient.on("error", (err) => {
    console.error("Redis Client Error:", err);
  });

  redisClient.on("connect", () => {
    console.log("Connected to Redis");
  });

  await redisClient.connect();
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call initRedis() first.");
  }
  return redisClient;
}

export async function saveSession(session: Session): Promise<void> {
  const client = getRedisClient();
  const key = `session:${session.id}`;
  await client.set(key, JSON.stringify(session));
  // Set expiration to 24 hours
  await client.expire(key, 86400);

  // Note: We do NOT set active-session-id here anymore
  // Active session is only set when creating a new session (see setActiveSession)
}

export async function setActiveSession(sessionId: string): Promise<void> {
  const client = getRedisClient();
  await client.set("active-session-id", sessionId);
  await client.expire("active-session-id", 86400);
  console.log(`Set active session ID to: ${sessionId}`);
}

export async function getActiveSessionId(): Promise<string | null> {
  const client = getRedisClient();
  const activeId = await client.get("active-session-id");
  return activeId;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const client = getRedisClient();
  const key = `session:${sessionId}`;
  const data = await client.get(key);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as Session;
  } catch (error) {
    console.error(`Failed to parse session data for ${sessionId}:`, error);
    // Delete corrupted session data
    await client.del(key);
    throw new Error(`Session data corrupted for ${sessionId}. Session has been removed.`);
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const client = getRedisClient();
  const key = `session:${sessionId}`;
  await client.del(key);
  
  // If this was the active session, clear the active session ID
  const activeSessionId = await client.get("active-session-id");
  if (activeSessionId === sessionId) {
    await client.del("active-session-id");
    console.log(`Cleared active session ID for deleted session: ${sessionId}`);
  }
}

export async function getAllSessionIds(): Promise<string[]> {
  const client = getRedisClient();
  const sessionIds: string[] = [];

  // Use SCAN instead of KEYS for better performance in production
  let cursor = 0;
  do {
    const result = await client.scan(cursor, {
      MATCH: "session:*",
      COUNT: 100,
    });

    cursor = result.cursor;
    const keys = result.keys;

    sessionIds.push(...keys.map((key) => key.replace("session:", "")));
  } while (cursor !== 0);

  return sessionIds;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
