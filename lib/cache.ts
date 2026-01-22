import Redis from "ioredis"
import { env } from "@/lib/env"

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

// Cache keys
const CACHE_KEYS = {
  BRIEFING: (userId: string, date: string) => `briefing:${userId}:${date}`,
  POPULAR_STOCKS: (date: string) => `popular:stocks:${date}`,
  STOCK_QUOTE: (ticker: string) => `stock:quote:${ticker}`,
  STOCK_NEWS: (ticker: string, date: string) => `stock:news:${ticker}:${date}`,
}

// TTL in seconds
export const TTL = {
  BRIEFING: 60 * 60 * 24,
  POPULAR_STOCKS: 60 * 30,
  STOCK_QUOTE: 60 * 5,
  STOCK_NEWS: 60 * 30,
}

// Get value from cache
export async function getCached<T>(key: string): Promise<T | null> {
  const value = await redis.get(key)
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null as T
  }
}

// Set value in cache
export async function setCache(key: string, value: unknown, ttlSeconds: number) {
  await redis.setex(key, ttlSeconds, JSON.stringify(value))
}

// Delete from cache
export async function invalidateCache(key: string) {
  await redis.del(key)
}

// Get or set pattern
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const cached = await getCached<T>(key)
  if (cached) return cached
  
  const value = await fetcher()
  await setCache(key, value, ttlSeconds)
  return value
}

// Invalidate multiple keys
export async function invalidateMultiple(keys: string[]) {
  await redis.del(...keys)
}

// Health check
export async function checkRedisHealth() {
  try {
    await redis.ping()
    return { healthy: true }
  } catch {
    return { healthy: false }
  }
}

export { redis }
