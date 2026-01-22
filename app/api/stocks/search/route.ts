import { NextResponse } from "next/server"
import { finnhub } from "@/lib/clients/finnhub"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query || query.length < 1) {
      return NextResponse.json({ result: [] })
    }

    // First check local database
    const localStocks = await db.stock.findMany({
      where: {
        OR: [
          { ticker: { contains: query.toUpperCase(), mode: "insensitive" } },
          { nameEn: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
    })

    if (localStocks.length >= 10) {
      return NextResponse.json({
        result: localStocks.map((s: { ticker: string; nameEn: string }) => ({
          ticker: s.ticker,
          name: s.nameEn,
        })),
      })
    }

    // Search via Finnhub API
    const searchResults = await finnhub.searchSymbol(query)

    // Filter and combine results
    const combined = [
      ...localStocks.map((s: { ticker: string; nameEn: string }) => ({
        ticker: s.ticker,
        name: s.nameEn,
      })),
      ...searchResults.result
        .filter((r) => r.type === "Common Stock")
        .slice(0, 10 - localStocks.length)
        .map((r) => ({
          ticker: r.symbol,
          name: r.description,
        })),
    ]

    // Remove duplicates
    const unique = Array.from(
      new Map(combined.map((s: { ticker: string }) => [s.ticker, s])).values()
    )

    return NextResponse.json({ result: unique.slice(0, 10) })
  } catch (error) {
    console.error("Stock search error:", error)
    return NextResponse.json(
      { error: "주식 검색 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
