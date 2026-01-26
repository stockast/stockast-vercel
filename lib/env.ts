import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  VERCEL: z.string().optional(),
  
  // Database
  DATABASE_URL: z.string().min(1),
  
  // Redis (Upstash or local)
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // Finnhub (Stock Data)
  FINNHUB_API_KEY: z.string().min(1).optional(),
  
  // OpenAI (LLM)
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  
  // Auth
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  
  // Scheduler
  CRON_SECRET: z.string().min(1).optional(),
})

const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.flatten().fieldErrors)
  throw new Error("Invalid environment variables")
}

export const env = _env.data

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1"
}
