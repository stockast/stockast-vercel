import { NextResponse } from "next/server"
import { scheduleDailyBriefing, schedulePopularityAggregation } from "@/lib/queue"
import { env } from "@/lib/env"
import { getKstNow } from "@/lib/dates"

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (!env.CRON_SECRET) {
      return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get date from query or use today
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")
    
    const today = dateParam 
      ? new Date(dateParam) 
      : new Date()

    const dateStr = getKstNow(today).toISOString().split("T")[0]

    const force = searchParams.get("force") === "true"

    // Enqueue the daily briefing job
    await scheduleDailyBriefing(dateStr, force)

    // Enqueue popularity aggregation for the same edition date
    await schedulePopularityAggregation(dateStr)

    return NextResponse.json({
      success: true,
      message: `Daily briefing + popularity jobs enqueued for ${dateStr}`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Cron error:", error)
    return NextResponse.json(
      { error: "Failed to enqueue daily briefing job" },
      { status: 500 }
    )
  }
}
