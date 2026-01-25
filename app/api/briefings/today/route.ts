import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCached, invalidateCache, setCache, TTL } from "@/lib/cache"
import { getUserId } from "@/lib/auth/session"
import { kstEditionYmd, utcDateFromYmd } from "@/lib/dates"
import { generateBriefingForUser } from "@/lib/jobs/dailyBriefing"

export async function GET(request: Request) {
  try {
    let userId = await getUserId()
    
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

    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get("refresh") === "true"
    const force = searchParams.get("force") === "true"

    const ymd = kstEditionYmd(new Date())
    const today = utcDateFromYmd(ymd)

    const cacheKey = `briefing:${userId}:${today.toISOString()}`

    if (refresh) {
      await invalidateCache(cacheKey)
      try {
        await generateBriefingForUser({ userId, date: ymd, forceRegenerate: force })
      } catch (error) {
        console.error("Briefing generate error:", error)
        const detail = error instanceof Error ? error.message : String(error)
        return NextResponse.json(
          { error: "브리핑 생성에 실패했습니다.", detail },
          { status: 500 }
        )
      }
    }

    const cached = await getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

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
      return NextResponse.json({
        exists: false,
        message: "오늘의 브리핑이 아직 생성되지 않았습니다.",
        nextUpdate: "새로고침을 누르면 즉시 생성합니다.",
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
      asOf: briefing.createdAt.toISOString(),
    }

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
