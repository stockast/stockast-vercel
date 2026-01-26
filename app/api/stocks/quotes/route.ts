import { NextResponse } from "next/server"
import { finnhub } from "@/lib/clients/finnhub"
import { CACHE_KEYS, getCached, setCache, TTL } from "@/lib/cache"

type Quote = {
  ticker: string
  price: number
  change: number
  changePercent: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const raw = searchParams.get("tickers")
    if (!raw) {
      return NextResponse.json({ quotes: [] })
    }

    const tickers = raw
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 30)

    const items = await Promise.all(
      tickers.map(async (ticker) => {
        const cacheKey = CACHE_KEYS.STOCK_QUOTE(ticker)
        const cached = await getCached<Quote>(cacheKey)
        if (cached) return cached

        const q = await finnhub.getQuote(ticker)
        if (!q) return null

        const quote: Quote = {
          ticker,
          price: q.c,
          change: q.d,
          changePercent: q.dp,
        }

        await setCache(cacheKey, quote, TTL.STOCK_QUOTE)
        return quote
      })
    )

    const quotes = items.filter((q): q is Quote => Boolean(q))

    const result = { quotes, asOf: new Date().toISOString() }
    return NextResponse.json(result)
  } catch (error) {
    console.error("Stock quotes error:", error)
    return NextResponse.json(
      { error: "주가 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
