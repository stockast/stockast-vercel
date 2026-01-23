import Redis from "ioredis"
import { env } from "@/lib/env"
import { processDailyBriefing } from "@/lib/jobs/dailyBriefing"
import { aggregatePopularity } from "@/lib/jobs/popularity"

// Build Redis URL
const REDIS_URL = env.REDIS_URL || "redis://localhost:6379"

console.log(`🚀 Worker starting with Redis: ${REDIS_URL}`)

// Create connections
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: () => null,
})

const QUEUE_KEY = "stockast:jobs"

async function processJob(data: any) {
  console.log(`📋 Processing:`, data)
  
  try {
    if (data.type === "daily-briefing") {
      await processDailyBriefing({ date: data.date, forceRegenerate: data.force })
    } else if (data.type === "popularity") {
      await aggregatePopularity({ date: data.date })
    }
    console.log(`✅ Done: ${data.type}`)
  } catch (error) {
    console.error(`❌ Failed: ${data.type}`, error)
    throw error
  }
}

async function startWorker() {
  console.log(`👂 Listening for jobs on queue: ${QUEUE_KEY}`)
  
  redis.on('error', (err) => console.error('Redis error:', err.message))
  redis.on('connect', () => console.log('✅ Redis connected'))

  while (true) {
    try {
      // BRPOP: blocking pop from list (waits for new jobs)
      const result = await redis.brpop(QUEUE_KEY, 3)
      
      if (result) {
        const [queueName, jobDataStr] = result
        const jobData = JSON.parse(jobDataStr)
        
        await processJob(jobData)
        
        // Remove from queue after processing
        redis.lrem(QUEUE_KEY, 1, jobDataStr)
      }
    } catch (error: any) {
      if (error.message !== 'Connection is closed.') {
        console.error('❌ Error:', error.message)
      }
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Shutting down worker...')
  await redis.quit()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

console.log('✅ Worker ready')
startWorker().catch(err => {
  console.error('💥 Fatal:', err)
  process.exit(1)
})
