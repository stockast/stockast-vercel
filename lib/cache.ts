import Redis from "ioredis"
import { env, isProductionRuntime } from "@/lib/env"

function getRedisUrlOrNull(): string | null {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    const url = new URL(env.UPSTASH_REDIS_REST_URL)
    return `rediss://:${env.UPSTASH_REDIS_REST_TOKEN}@${url.hostname}:37561`
  }

  if (env.REDIS_URL) return env.REDIS_URL

  // Avoid trying localhost Redis on Vercel/production.
  if (isProductionRuntime()) return null

  return "redis://localhost:6379"
}

const redisUrl = getRedisUrlOrNull()

const redis: Redis | null = redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        void times
        return null
      },
    })
  : null

if (redisUrl) {
  console.log(`[Cache] Redis: ${redisUrl.substring(0, 60)}...`)
  redis?.on("connect", () => {
    console.log("[Cache] Redis connected!")
  })

  redis?.on("error", (err) => {
    console.log(`[Cache] Redis error: ${err.message}`)
  })
} else {
  console.log("[Cache] Redis disabled (no configuration)")
}

// Cache keys
export const CACHE_KEYS = {
  BRIEFING: (userId: string, date: string) => `briefing:${userId}:${date}`,
  POPULAR_STOCKS: (date: string) => `popular:stocks:${date}`,
  STOCK_QUOTE: (ticker: string) => `stock:quote:${ticker}`,
  STOCK_NEWS: (ticker: string, date: string) => `stock:news:${ticker}:${date}`,
}

// TTL in seconds
export const TTL = {
  BRIEFING: 6 * 60 * 60,
  POPULAR_STOCKS: 30 * 60,
  STOCK_QUOTE: 60 * 5,
  STOCK_NEWS: 24 * 60 * 60,
  FEAR_GREED: 24 * 60 * 60,
}

// Get value from cache
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    if (!redis) return null
    const value = await redis.get(key)
    if (!value) return null
    try {
      return JSON.parse(value) as T
    } catch {
      return null as T
    }
  } catch {
    return null
  }
}

// Set value in cache
export async function setCache(key: string, value: unknown, ttlSeconds: number) {
  try {
    if (!redis) return
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
  } catch {
    // ignore cache write failures
  }
}

// Delete from cache
export async function invalidateCache(key: string) {
  try {
    if (!redis) return
    await redis.del(key)
  } catch {
    // ignore cache delete failures
  }
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
  try {
    if (!redis) return
    await redis.del(...keys)
  } catch {
    // ignore
  }
}

// Health check
export async function checkRedisHealth() {
  try {
    if (!redis) return { healthy: false }
    await redis.ping()
    return { healthy: true }
  } catch {
    return { healthy: false }
  }
}

export { redis }
