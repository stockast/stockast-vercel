import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCached, setCache, TTL } from "@/lib/cache"
import { getUserId } from "@/lib/auth/session"

export async function GET(request: Request) {
  try {
    // Try session auth first, fallback to query param
    let userId = await getUserId()
    
    // If no session, try query param (for localStorage migration)
    if (!userId) {
      const { searchParams } = new URL(request.url)
      const queryUserId = searchParams.get("userId")
      userId = queryUserId || null
    }

    if (!userId) {
      return NextResponse.json(
        { error: "userId가 필요합니다." },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check cache first
    const cacheKey = `briefing:${userId}:${today.toISOString()}`
    const cached = await getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Get user's briefing
    const briefing = await db.briefing.findUnique({
      where: {
        userId_briefingDate: {
          userId,
          briefingDate: today,
        },
      },
      include: {
        user: {
          include: {
            favoriteStocks: {
              include: { stock: { select: { ticker: true, nameEn: true } } },
              orderBy: { rank: "asc" },
            },
          },
        },
      },
    })

    if (!briefing) {
      // If no briefing for today, return a placeholder
      return NextResponse.json({
        exists: false,
        message: "오늘의 브리핑이 아직 생성되지 않았습니다.",
        nextUpdate: "매일 오전 8시 30분에 업데이트됩니다.",
      })
    }

    const response = {
      exists: true,
      date: briefing.briefingDate,
      content: briefing.content,
      stocks: briefing.user.favoriteStocks.map((fs: { stock: { ticker: string; nameEn: string }; rank: number }) => ({
        ticker: fs.stock.ticker,
        name: fs.stock.nameEn,
        rank: fs.rank,
      })),
      generatedAt: briefing.createdAt,
    }

    // Cache for 24 hours
    await setCache(cacheKey, response, TTL.BRIEFING)

    return NextResponse.json(response)
  } catch (error) {
    console.error("Briefing fetch error:", error)
    return NextResponse.json(
      { error: "브리핑 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
