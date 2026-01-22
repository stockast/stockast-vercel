import { NextResponse } from "next/server"
import { scheduleDailyBriefing } from "@/lib/queue"
import { env } from "@/lib/env"

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get date from query or use today
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")
    
    const today = dateParam 
      ? new Date(dateParam) 
      : new Date()
    
    const dateStr = today.toISOString().split("T")[0]

    // Enqueue the daily briefing job
    await scheduleDailyBriefing(dateStr, searchParams.get("force") === "true")

    return NextResponse.json({
      success: true,
      message: `Daily briefing job enqueued for ${dateStr}`,
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
