import { Queue } from "bullmq"
import { env, isProductionRuntime } from "@/lib/env"
import { bullmqConnectionFromUrl } from "@/lib/workers/bullmqConnection"

export const DAILY_BRIEFING_QUEUE = "daily-briefing"
export const POPULARITY_QUEUE = "popularity"

function getRedisUrlOrNull(): string | null {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    const url = new URL(env.UPSTASH_REDIS_REST_URL)
    return `rediss://:${env.UPSTASH_REDIS_REST_TOKEN}@${url.hostname}:37561`
  }

  if (env.REDIS_URL) return env.REDIS_URL

  // Avoid trying localhost Redis on Vercel/production.
  if (isProductionRuntime()) return null

  return null
}

const redisUrl = getRedisUrlOrNull()
const connection = redisUrl ? bullmqConnectionFromUrl(redisUrl) : null

let dailyBriefingQueue: Queue | null = null
let popularityQueue: Queue | null = null

function getDailyBriefingQueue() {
  if (!connection) return null
  if (!dailyBriefingQueue) {
    dailyBriefingQueue = new Queue(DAILY_BRIEFING_QUEUE, { connection })
  }
  return dailyBriefingQueue
}

function getPopularityQueue() {
  if (!connection) return null
  if (!popularityQueue) {
    popularityQueue = new Queue(POPULARITY_QUEUE, { connection })
  }
  return popularityQueue
}

export async function scheduleDailyBriefing(date: string, forceRegenerate = false) {
  const q = getDailyBriefingQueue()
  if (!q) return

  await q.add(
    "generate-briefing",
    { date, forceRegenerate },
    {
      jobId: `daily-briefing:${date}${forceRegenerate ? ":force" : ""}`,
      removeOnComplete: { age: 24 * 60 * 60, count: 100 },
      removeOnFail: { age: 7 * 24 * 60 * 60, count: 50 },
    }
  )
}

export async function scheduleUserBriefing(userId: string, date: string, forceRegenerate = false) {
  const q = getDailyBriefingQueue()
  if (!q) return

  await q.add(
    "generate-user-briefing",
    { userId, date, forceRegenerate },
    {
      jobId: `user-briefing:${userId}:${date}${forceRegenerate ? ":force" : ""}`,
      removeOnComplete: { age: 24 * 60 * 60, count: 500 },
      removeOnFail: { age: 7 * 24 * 60 * 60, count: 200 },
    }
  )
}

export async function schedulePopularityAggregation(date: string) {
  const q = getPopularityQueue()
  if (!q) return

  await q.add(
    "aggregate-popularity",
    { date },
    {
      jobId: `popularity:${date}`,
      removeOnComplete: { age: 24 * 60 * 60, count: 100 },
      removeOnFail: { age: 7 * 24 * 60 * 60, count: 50 },
    }
  )
}
