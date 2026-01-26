import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCached, setCache, TTL } from "@/lib/cache"
import { getUserId } from "@/lib/auth/session"
import { kstEditionYmd, utcDateFromYmd } from "@/lib/dates"
import { scheduleUserBriefing } from "@/lib/queue"

export async function GET(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get("refresh") === "true"
    const force = searchParams.get("force") === "true"

    const ymd = kstEditionYmd(new Date())
    const today = utcDateFromYmd(ymd)

    const cacheKey = `briefing:${userId}:${today.toISOString()}`

    if (refresh) {
      scheduleUserBriefing(userId, ymd, force).catch((error) => {
        console.error("Briefing enqueue error:", error)
      })
    }

    const cached = await getCached(cacheKey)
    if (cached) {
      return NextResponse.json({ ...cached, queued: refresh })
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
        queued: refresh,
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
      queued: refresh,
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
