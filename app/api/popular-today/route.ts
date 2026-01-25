import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCached, setCache, TTL } from "@/lib/cache"
import { kstEditionYmd, utcDateFromYmd } from "@/lib/dates"

type PopularStock = {
  ticker: string
  name: string
  views: number
  clicks: number
  favorites: number
  totalEngagement: number
  engagement: number
  price?: number
  change?: number
  changePercent?: number
}

function normalizePopularStock(raw: unknown): PopularStock | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const ticker = typeof r.ticker === "string" ? r.ticker : null
  const name = typeof r.name === "string" ? r.name : null
  if (!ticker || !name) return null

  const totalEngagement =
    typeof r.totalEngagement === "number"
      ? r.totalEngagement
      : typeof r.score === "number"
        ? r.score
        : typeof r.engagement === "number"
          ? r.engagement
          : 0

  const views = typeof r.views === "number" ? r.views : 0
  const clicks = typeof r.clicks === "number" ? r.clicks : 0
  const favorites = typeof r.favorites === "number" ? r.favorites : 0

  return {
    ticker,
    name,
    views,
    clicks,
    favorites,
    totalEngagement,
    engagement: totalEngagement,
  }
}

async function attachPrices(statDate: Date, stocks: PopularStock[]) {
  const tickers = stocks.map((s) => s.ticker)
  if (tickers.length === 0) return

  const foundStocks = await db.stock.findMany({
    where: { ticker: { in: tickers } },
    select: { id: true, ticker: true },
  })

  const stockIdByTicker = new Map(foundStocks.map((s) => [s.ticker, s.id]))
  const stockIds = foundStocks.map((s) => s.id)
  if (stockIds.length === 0) return

  const prices = await db.dailyPrice.findMany({
    where: { tradeDate: statDate, stockId: { in: stockIds } },
    select: {
      stockId: true,
      closePrice: true,
      changeAmount: true,
      changePercent: true,
    },
  })

  const priceById = new Map(
    prices.map((p) => [
      p.stockId,
      {
        price: Number(p.closePrice),
        change: p.changeAmount === null ? undefined : Number(p.changeAmount),
        changePercent: p.changePercent === null ? undefined : Number(p.changePercent),
      },
    ])
  )

  for (const s of stocks) {
    const stockId = stockIdByTicker.get(s.ticker)
    if (!stockId) continue
    const p = priceById.get(stockId)
    if (!p) continue
    s.price = p.price
    s.change = p.change
    s.changePercent = p.changePercent
  }
}

async function fillToAtLeastTen(stocks: PopularStock[]) {
  if (stocks.length >= 10) return

  const existing = new Set(stocks.map((s) => s.ticker))
  const need = 10 - stocks.length

  const extras = await db.stock.findMany({
    where: { isActive: true },
    select: { ticker: true, nameEn: true },
    orderBy: { ticker: "asc" },
    take: 50,
  })

  for (const s of extras) {
    if (existing.has(s.ticker)) continue
    stocks.push({
      ticker: s.ticker,
      name: s.nameEn,
      views: 0,
      clicks: 0,
      favorites: 0,
      totalEngagement: 0,
      engagement: 0,
    })
    existing.add(s.ticker)
    if (stocks.length >= 10) break
  }

  // If the DB itself has fewer than 10 active stocks, we just return what we have.
  void need
}

export async function GET() {
  try {
    const ymd = kstEditionYmd(new Date())
    const statDate = utcDateFromYmd(ymd)

    const cacheKey = `popular:stocks:${ymd}`
    const cached = await getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const popular = await db.popularInterest.findUnique({
      where: { statDate },
    })

    if (popular) {
      const topStocksRaw = Array.isArray(popular.topStocks) ? popular.topStocks : []
      const topStocks = topStocksRaw
        .map(normalizePopularStock)
        .filter((s): s is PopularStock => Boolean(s))
      await fillToAtLeastTen(topStocks)
      await attachPrices(statDate, topStocks)
      const response = {
        date: popular.statDate,
        topStocks,
        trendingTopics: popular.trendingTopics,
        asOf: popular.generatedAt.toISOString(),
      }

      await setCache(cacheKey, response, TTL.POPULAR_STOCKS)
      return NextResponse.json(response)
    }

    const fromDaily = await db.popularityDaily.findMany({
      where: { statDate },
      orderBy: { totalEngagement: "desc" },
      take: 50,
      include: { stock: { select: { ticker: true, nameEn: true } } },
    })

    const dailyTop = fromDaily.map(
      (ps: {
        stock: { ticker: string; nameEn: string }
        views: number
        clicks: number
        favorites: number
        totalEngagement: number
      }) => ({
        ticker: ps.stock.ticker,
        name: ps.stock.nameEn,
        views: ps.views,
        clicks: ps.clicks,
        favorites: ps.favorites,
        totalEngagement: ps.totalEngagement,
        engagement: ps.totalEngagement,
      })
    )

    let topStocks = dailyTop

    if (topStocks.length === 0) {
      // Fallback: rank by total favorite counts (works even without UserEvent telemetry)
      const grouped = await db.userFavoriteStock.groupBy({
        by: ["stockId"],
        _count: { stockId: true },
        orderBy: { _count: { stockId: "desc" } },
        take: 50,
      })

      const stockIds = grouped.map((g: { stockId: string }) => g.stockId)
      const stocks = await db.stock.findMany({
        where: { id: { in: stockIds } },
        select: { id: true, ticker: true, nameEn: true },
      })

      const byId = new Map(stocks.map((s) => [s.id, s]))
      topStocks = grouped
        .map((g: { stockId: string; _count: { stockId: number } }) => {
          const stock = byId.get(g.stockId)
          if (!stock) return null
          const favorites = g._count.stockId
          const totalEngagement = favorites * 3
          return {
            ticker: stock.ticker,
            name: stock.nameEn,
            views: 0,
            clicks: 0,
            favorites,
            totalEngagement,
            engagement: totalEngagement,
          }
        })
        .filter(Boolean) as PopularStock[]
    }

    await fillToAtLeastTen(topStocks)

    await attachPrices(statDate, topStocks)

    const response = {
      date: statDate,
      topStocks,
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
