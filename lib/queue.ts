import { Queue } from "bullmq"
import { env } from "@/lib/env"
import { bullmqConnectionFromUrl } from "@/lib/workers/bullmqConnection"

export const DAILY_BRIEFING_QUEUE = "daily-briefing"
export const POPULARITY_QUEUE = "popularity"

function getRedisUrl(): string {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    const url = new URL(env.UPSTASH_REDIS_REST_URL)
    return `rediss://:${env.UPSTASH_REDIS_REST_TOKEN}@${url.hostname}:37561`
  }
  return env.REDIS_URL || "redis://localhost:6379"
}

const redisUrl = getRedisUrl()
const connection = bullmqConnectionFromUrl(redisUrl)

const dailyBriefingQueue = new Queue(DAILY_BRIEFING_QUEUE, { connection })
const popularityQueue = new Queue(POPULARITY_QUEUE, { connection })

export async function scheduleDailyBriefing(date: string, forceRegenerate = false) {
  await dailyBriefingQueue.add(
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
  await dailyBriefingQueue.add(
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
  await popularityQueue.add(
    "aggregate-popularity",
    { date },
    {
      jobId: `popularity:${date}`,
      removeOnComplete: { age: 24 * 60 * 60, count: 100 },
      removeOnFail: { age: 7 * 24 * 60 * 60, count: 50 },
    }
  )
}
