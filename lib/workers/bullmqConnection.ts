import type { ConnectionOptions } from "bullmq"

export function bullmqConnectionFromUrl(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl)

  const port = url.port ? Number(url.port) : url.protocol === "rediss:" ? 6380 : 6379
  const password = url.password ? decodeURIComponent(url.password) : undefined

  return {
    host: url.hostname,
    port,
    password,
    tls: url.protocol === "rediss:" ? {} : undefined,
  }
}
