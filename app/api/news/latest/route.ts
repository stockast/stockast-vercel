import { NextResponse } from "next/server"
import { finnhub } from "@/lib/clients/finnhub"
import { getCached, setCache, TTL } from "@/lib/cache"

function getKstNow(now: Date) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
}

function kstEditionDateString(now: Date) {
  const kst = getKstNow(now)
  const edition = new Date(kst)
  if (kst.getHours() < 8) {
    edition.setDate(edition.getDate() - 1)
  }
  return edition.toISOString().slice(0, 10)
}

function secondsUntilNextKst0800(now: Date) {
  const kst = getKstNow(now)
  const next = new Date(kst)
  next.setHours(8, 0, 0, 0)
  if (kst.getTime() >= next.getTime()) {
    next.setDate(next.getDate() + 1)
  }

  const nextUtc = new Date(next.getTime() - 9 * 60 * 60 * 1000)
  const seconds = Math.floor((nextUtc.getTime() - now.getTime()) / 1000)
  return Math.max(60, seconds)
}

export async function GET() {
  try {
    const now = new Date()
    const editionDate = kstEditionDateString(now)
    const cacheKey = `news:edition:${editionDate}`

    const cached = await getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const news = await finnhub.getGeneralNews('general')

    const result = {
      editionDate,
      news: news.slice(0, 10).map((item: any) => ({
        id: item.id?.toString() || item.headline,
        title: item.headline,
        source: item.source,
        url: item.url,
        publishedAt: new Date(item.datetime * 1000).toISOString(),
        summary: item.summary,
        image: item.image,
        related: item.related,
      })),
      asOf: now.toISOString(),
    }

    const ttl = Math.min(TTL.STOCK_NEWS, secondsUntilNextKst0800(now))
    await setCache(cacheKey, result, ttl)

    return NextResponse.json(result)
  } catch (error) {
    console.error("News fetch error:", error)
    return NextResponse.json(
      { error: "뉴스를 가져올 수 없습니다." },
      { status: 500 }
    )
  }
}
