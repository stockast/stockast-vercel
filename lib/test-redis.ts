import Redis from "ioredis"

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

if (!url || !token) {
  console.log("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN")
  process.exit(1)
}

const hostname = new URL(url).hostname
const redisUrl = `rediss://:${token}@${hostname}:37561`

console.log(`Testing connection to: ${hostname}:37561`)

const redis = new Redis(redisUrl, {
  connectTimeout: 10000,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 3) return null
    return Math.min(times * 200, 2000)
  }
})

redis.on('connect', () => {
  console.log('✅ Connected!')
  redis.ping().then((r: string) => {
    console.log(`PING response: ${r}`)
    redis.quit()
  }).catch((err: Error) => {
    console.error('PING error:', err)
    redis.quit()
  })
})

redis.on('error', (err: Error) => {
  console.error('❌ Connection error:', err.message)
})

setTimeout(() => {
  console.log('⏰ Timeout - closing...')
  redis.disconnect()
  process.exit(1)
}, 15000)
