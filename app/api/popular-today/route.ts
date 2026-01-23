import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCached, setCache, TTL } from "@/lib/cache"

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const cacheKey = `popular:stocks:${today.toISOString()}`
    const cached = await getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const popular = await db.popularInterest.findUnique({
      where: { statDate: today },
    })

    if (popular) {
      const response = {
        date: popular.statDate,
        topStocks: popular.topStocks,
        trendingTopics: popular.trendingTopics,
        asOf: popular.generatedAt.toISOString(),
      }

      await setCache(cacheKey, response, TTL.POPULAR_STOCKS)
      return NextResponse.json(response)
    }

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const topStocks = await db.popularityDaily.findMany({
      where: {
        statDate: {
          gte: yesterday,
          lt: today,
        },
      },
      orderBy: { totalEngagement: "desc" },
      take: 10,
      include: { stock: { select: { ticker: true, nameEn: true } } },
    })

    const response = {
      date: today,
      topStocks: topStocks.map((ps: { stock: { ticker: string; nameEn: string }; views: number; clicks: number; favorites: number; totalEngagement: number }) => ({
        ticker: ps.stock.ticker,
        name: ps.stock.nameEn,
        views: ps.views,
        clicks: ps.clicks,
        favorites: ps.favorites,
        engagement: ps.totalEngagement,
      })),
      trendingTopics: [],
      asOf: new Date().toISOString(),
    }

    await setCache(cacheKey, response, TTL.POPULAR_STOCKS)
    return NextResponse.json(response)
  } catch (error) {
    console.error("Popular stocks error:", error)
    return NextResponse.json(
      { error: "인기 종목 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
