import { NextResponse } from "next/server"
import { finnhub } from "@/lib/clients/finnhub"
import { getCached, setCache, TTL } from "@/lib/cache"

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

    const cacheKey = `quotes:${tickers.join(",")}`
    const cached = await getCached<{ quotes: Quote[]; asOf: string }>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const quotes: Quote[] = []
    for (const ticker of tickers) {
      const q = await finnhub.getQuote(ticker)
      if (!q) continue
      quotes.push({
        ticker,
        price: q.c,
        change: q.d,
        changePercent: q.dp,
      })
    }

    const result = { quotes, asOf: new Date().toISOString() }
    await setCache(cacheKey, result, TTL.STOCK_QUOTE)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Stock quotes error:", error)
    return NextResponse.json(
      { error: "주가 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
