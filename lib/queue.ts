import { Queue, ConnectionOptions } from "bullmq"
import { env } from "@/lib/env"

// Parse Redis connection from URL or host/port
const getConnection = (): ConnectionOptions => {
  const url = process.env.REDIS_URL
  if (url) {
    return { connection: url } as ConnectionOptions
  }
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  }
}

export const DAILY_BRIEFING_QUEUE = "daily-briefing"
export const POPULARITY_QUEUE = "popularity"

export const dailyBriefingQueue = new Queue(DAILY_BRIEFING_QUEUE, { connection: getConnection() })
export const popularityQueue = new Queue(POPULARITY_QUEUE, { connection: getConnection() })

export interface DailyBriefingJobData {
  date: string
  forceRegenerate?: boolean
}

export interface PopularityJobData {
  date: string
}

export async function scheduleDailyBriefing(date: string, forceRegenerate = false) {
  await dailyBriefingQueue.add(
    "generate-briefing",
    { date, forceRegenerate } as DailyBriefingJobData,
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  )
}

export async function schedulePopularityAggregation(date: string) {
  await popularityQueue.add(
    "aggregate-popularity",
    { date } as PopularityJobData,
    {
      attempts: 1,
      removeOnComplete: true,
    }
  )
}

export async function checkQueueHealth() {
  const [dailyBriefingCount, popularityCount] = await Promise.all([
    dailyBriefingQueue.getWaitingCount(),
    popularityQueue.getWaitingCount(),
  ])
  
  return {
    queues: {
      [DAILY_BRIEFING_QUEUE]: { waiting: dailyBriefingCount },
      [POPULARITY_QUEUE]: { waiting: popularityCount },
    },
    healthy: true,
  }
}
