import { Worker } from "bullmq"
import { processDailyBriefing } from "@/lib/jobs/dailyBriefing"
import { aggregatePopularity } from "@/lib/jobs/popularity"
import { DAILY_BRIEFING_QUEUE } from "@/lib/queue"
import { bullmqConnectionFromUrl } from "@/lib/workers/bullmqConnection"

// Build Redis URL for worker
let redisUrl = ""
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const url = new URL(process.env.UPSTASH_REDIS_REST_URL)
  redisUrl = `rediss://:${process.env.UPSTASH_REDIS_REST_TOKEN}@${url.hostname}:37561`
} else {
  redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`
}

async function startWorker() {
  console.log("🚀 Starting BullMQ Worker...")
  console.log(`📡 Redis URL: ${redisUrl}`)

  const worker = new Worker(
    DAILY_BRIEFING_QUEUE,
    async (job) => {
      console.log(`📋 Processing job: ${job.name} for date: ${job.data.date}`)
      const startTime = Date.now()

      try {
        let result
        if (job.name === "generate-briefing") {
          result = await processDailyBriefing(job.data)
        } else if (job.name === "aggregate-popularity") {
          result = await aggregatePopularity(job.data)
        }

        const duration = Date.now() - startTime
        console.log(`✅ Job completed in ${duration}ms`)
        return result
      } catch (error) {
        console.error(`❌ Job failed:`, error)
        throw error
      }
    },
    {
      connection: bullmqConnectionFromUrl(redisUrl),
      concurrency: 1,
      removeOnComplete: {
        age: 24 * 60 * 60,
        count: 100,
      },
      removeOnFail: {
        age: 7 * 24 * 60 * 60,
        count: 50,
      },
    }
  )

  worker.on("completed", (job) => {
    console.log(`🎉 Job ${job.id} completed successfully`)
  })

  worker.on("failed", (job, err) => {
    console.error(`💥 Job ${job?.id} failed:`, err.message)
  })

  worker.on("error", (err) => {
    console.error("🚨 Worker error:", err)
  })

  console.log(`✅ Worker started, listening for jobs on queue: ${DAILY_BRIEFING_QUEUE}`)
  console.log("📝 Press Ctrl+C to stop")

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n🛑 Shutting down worker...")
    await worker.close()
    console.log("✅ Worker closed")
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

startWorker().catch((err) => {
  console.error("💥 Failed to start worker:", err)
  process.exit(1)
})
