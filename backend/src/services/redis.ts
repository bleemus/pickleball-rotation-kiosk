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
  
  // Set this as the active session
  await client.set("active-session-id", session.id);
  await client.expire("active-session-id", 86400);
}

export async function getActiveSessionId(): Promise<string | null> {
  const client = getRedisClient();
  return await client.get("active-session-id");
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const client = getRedisClient();
  const key = `session:${sessionId}`;
  const data = await client.get(key);

  if (!data) {
    return null;
  }

  return JSON.parse(data) as Session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const client = getRedisClient();
  const key = `session:${sessionId}`;
  await client.del(key);
}

export async function getAllSessionIds(): Promise<string[]> {
  const client = getRedisClient();
  const keys = await client.keys("session:*");
  return keys.map((key) => key.replace("session:", ""));
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
