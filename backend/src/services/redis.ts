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

  // Use optimistic locking to prevent concurrent modification conflicts
  // This will retry up to 3 times if another operation modifies the session
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // Watch the key for changes
      await client.watch(key);

      // Execute transaction
      const multi = client.multi();
      multi.set(key, JSON.stringify(session));
      multi.expire(key, 86400); // 24 hours

      const result = await multi.exec();

      // If result is null, the transaction was aborted due to concurrent modification
      if (result === null) {
        await client.unwatch(); // Clean up watch before retrying
        retries++;
        if (retries >= maxRetries) {
          throw new Error(`Failed to save session ${session.id} after ${maxRetries} retries due to concurrent modifications`);
        }
        // Wait a small random amount before retrying to reduce collision probability
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        continue;
      }

      // Transaction succeeded, unwatch before returning
      await client.unwatch();
      return;
    } catch (error) {
      // Unwatch on error
      await client.unwatch();
      throw error;
    }
  }

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

/**
 * Atomically updates a session using optimistic locking with retry logic
 * @param sessionId - The session ID to update
 * @param updateFn - Function that modifies the session
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns The updated session
 */
export async function updateSessionAtomic(
  sessionId: string,
  updateFn: (session: Session) => Session | Promise<Session>,
  maxRetries: number = 3
): Promise<Session> {
  const client = getRedisClient();
  const key = `session:${sessionId}`;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // Watch the key for changes
      await client.watch(key);

      // Read current session
      const data = await client.get(key);
      if (!data) {
        await client.unwatch();
        throw new Error(`Session ${sessionId} not found`);
      }

      let session: Session;
      try {
        session = JSON.parse(data) as Session;
      } catch (error) {
        await client.unwatch();
        await client.del(key);
        throw new Error(`Session data corrupted for ${sessionId}`);
      }

      // Apply the update function
      const updatedSession = await updateFn(session);

      // Execute transaction to save updated session
      const multi = client.multi();
      multi.set(key, JSON.stringify(updatedSession));
      multi.expire(key, 86400); // 24 hours

      const result = await multi.exec();

      // If result is null, another operation modified the session during our update
      if (result === null) {
        await client.unwatch(); // Clean up watch before retrying
        retries++;
        if (retries >= maxRetries) {
          throw new Error(`Failed to update session ${sessionId} after ${maxRetries} retries due to concurrent modifications`);
        }
        // Wait a small random amount before retrying to reduce collision probability
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        continue;
      }

      // Transaction succeeded, unwatch before returning
      await client.unwatch();
      return updatedSession;
    } catch (error) {
      // Unwatch on error
      await client.unwatch();
      throw error;
    }
  }

  throw new Error(`Failed to update session ${sessionId} after ${maxRetries} retries`);
}

/**
 * Flush all session data from Redis (for testing only)
 */
export async function flushAllSessions(): Promise<void> {
  const client = getRedisClient();

  // Get all session keys
  const sessionKeys: string[] = [];
  let cursor = 0;

  do {
    const result = await client.scan(cursor, {
      MATCH: "session:*",
      COUNT: 100,
    });

    cursor = result.cursor;
    sessionKeys.push(...result.keys);
  } while (cursor !== 0);

  // Also clear the active session ID
  const activeSessionKey = await client.exists("active-session-id");
  if (activeSessionKey) {
    sessionKeys.push("active-session-id");
  }

  // Delete all keys
  if (sessionKeys.length > 0) {
    await client.del(sessionKeys);
    console.log(`Flushed ${sessionKeys.length} keys from Redis`);
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
