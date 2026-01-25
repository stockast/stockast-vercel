interface LogEntry {
  level: "info" | "warn" | "error"
  category: string
  message: string
  context?: Record<string, unknown>
  timestamp?: Date
}

export async function log(entry: LogEntry) {
  const timestamp = entry.timestamp || new Date()

  // Console output
  const consoleMessage = `[${timestamp.toISOString()}] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}`
  if (entry.level === "error") {
    console.error(consoleMessage, entry.context || "")
  } else if (entry.level === "warn") {
    console.warn(consoleMessage, entry.context || "")
  } else {
    console.log(consoleMessage, entry.context || "")
  }

  // In production, you might want to store logs in the database
  // or send to a logging service like Datadog, Sentry, etc.
}

export async function logBriefingJob(
  jobId: string,
  status: "started" | "completed" | "failed",
  details?: Record<string, unknown>
) {
  await log({
    level: status === "failed" ? "error" : "info",
    category: "briefing-job",
    message: `Briefing job ${status}`,
    context: { jobId, ...details },
  })
}

export async function logError(
  category: string,
  error: Error,
  context?: Record<string, unknown>
) {
  await log({
    level: "error",
    category,
    message: error.message,
    context: {
      stack: error.stack,
      ...context,
    },
  })
}

export async function getRecentLogs(limit: number = 100) {
  // For now, just return from console/logging system
  // In production, you'd query from a database or logging service
  void limit
  return []
}
