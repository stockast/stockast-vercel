import { db } from "@/lib/db"
import Redis from "ioredis"
import { env } from "@/lib/env"

export const QUEUE_KEY = "stockast:jobs"

// Build Redis URL
const REDIS_URL = env.REDIS_URL || "redis://localhost:6379"

// Create Redis connection
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: () => null,
})

// Schedule a job
export async function scheduleJob(type: string, date: string, force = false) {
  const jobData = JSON.stringify({ type, date, force, scheduledAt: new Date().toISOString() })
  await redis.rpush(QUEUE_KEY, jobData)
  console.log(`📤 Job scheduled: ${type} for ${date}`)
}

// Schedule daily briefing
export async function scheduleDailyBriefing(date: string, forceRegenerate = false) {
  await scheduleJob("daily-briefing", date, forceRegenerate)
}

// Schedule popularity aggregation
export async function schedulePopularityAggregation(date: string) {
  await scheduleJob("popularity", date)
}

// Health check
export async function checkQueueHealth() {
  try {
    const len = await redis.llen(QUEUE_KEY)
    return { healthy: true, waitingJobs: len }
  } catch {
    return { healthy: false, waitingJobs: 0 }
  }
}
