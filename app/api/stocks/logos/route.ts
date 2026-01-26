import { NextResponse } from "next/server"
import { finnhub } from "@/lib/clients/finnhub"
import { getCached, setCache } from "@/lib/cache"

type LogoItem = { ticker: string; logoUrl: string | null }

const LOGO_TTL_SECONDS = 30 * 24 * 60 * 60

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const raw = searchParams.get("tickers")

    const tickers = (raw ? raw.split(",") : [])
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 50)

    if (tickers.length === 0) {
      return NextResponse.json({ logos: [] satisfies LogoItem[] })
    }

    const logos = (
      await Promise.all(
        tickers.map(async (ticker) => {
          const cacheKey = `stock:logo:${ticker}`
          const cached = await getCached<LogoItem>(cacheKey)
          if (cached) return cached

          const profile = await finnhub.getCompanyProfile(ticker)
          const logoUrl = profile?.logo ? String(profile.logo) : null
          const item: LogoItem = { ticker, logoUrl }
          await setCache(cacheKey, item, LOGO_TTL_SECONDS)
          return item
        })
      )
    ).filter((item): item is LogoItem => Boolean(item))

    return NextResponse.json({ logos, asOf: new Date().toISOString() })
  } catch (error) {
    console.error("Stock logos error:", error)
    return NextResponse.json(
      { error: "로고 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
