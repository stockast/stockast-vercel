import { Worker } from "bullmq"
import { aggregatePopularity } from "@/lib/jobs/popularity"
import { POPULARITY_QUEUE } from "@/lib/queue"

async function startPopularityWorker() {
  console.log("🚀 Starting Popularity Worker...")
  console.log(`📡 Redis connection: ${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`)

  const worker = new Worker(
    POPULARITY_QUEUE,
    async (job) => {
      console.log(`📋 Processing job: ${job.name} for date: ${job.data.date}`)
      const startTime = Date.now()

      try {
        const result = await aggregatePopularity(job.data)
        const duration = Date.now() - startTime

        console.log(`✅ Popularity job completed in ${duration}ms`)
        console.log(`   - Stocks processed: ${result.stocksProcessed}`)
        console.log(`   - Top stocks: ${result.topStocksCount}`)

        return result
      } catch (error) {
        console.error(`❌ Popularity job failed:`, error)
        throw error
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
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
    console.log(`🎉 Popularity job ${job.id} completed`)
  })

  worker.on("failed", (job, err) => {
    console.error(`💥 Popularity job ${job?.id} failed:`, err.message)
  })

  worker.on("error", (err) => {
    console.error("🚨 Popularity worker error:", err)
  })

  console.log(`✅ Popularity worker started, listening on queue: ${POPULARITY_QUEUE}`)
  console.log("📝 Press Ctrl+C to stop")

  const shutdown = async () => {
    console.log("\n🛑 Shutting down popularity worker...")
    await worker.close()
    console.log("✅ Worker closed")
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

startPopularityWorker().catch((err) => {
  console.error("💥 Failed to start popularity worker:", err)
  process.exit(1)
})
