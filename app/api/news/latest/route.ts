import { NextResponse } from "next/server"
import { finnhub, NewsArticle } from "@/lib/clients/finnhub"
import { getCached, setCache, TTL } from "@/lib/cache"
import { summarizeNewsToKorean } from "@/lib/clients/openai"
import { kstEditionYmd } from "@/lib/dates"

function secondsUntilNextKst0800(now: Date) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
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
    const editionDate = kstEditionYmd(now)
    const cacheKey = `news:edition:${editionDate}`

    const cached = await getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const news = await finnhub.getGeneralNews("general")

    if (!Array.isArray(news) || news.length === 0) {
      return NextResponse.json(
        { error: "뉴스 원문을 가져오지 못했습니다." },
        { status: 502 }
      )
    }

    const baseItems = news.slice(0, 10).map((item: NewsArticle) => ({
      id: item.id?.toString() || item.headline,
      title: item.headline,
      source: item.source,
      url: item.url,
      publishedAt: new Date(item.datetime * 1000).toISOString(),
      summary: item.summary,
      image: item.image,
      related: item.related,
    }))

    let koById = new Map<string, { titleKo: string; summaryKo: string }>()
    try {
      const ko = await summarizeNewsToKorean(
        baseItems.map((i) => ({ id: i.id, title: i.title, summary: i.summary, source: i.source }))
      )
      koById = new Map(ko.map((k) => [k.id, { titleKo: k.titleKo, summaryKo: k.summaryKo }]))
    } catch (error) {
      console.error("News summarize error:", error)
      return NextResponse.json(
        { error: "뉴스 요약 생성에 실패했습니다." },
        { status: 500 }
      )
    }

    let missing = baseItems.filter((i) => !koById.has(i.id))
    if (missing.length > 0) {
      // Retry once for missing items (LLM sometimes returns partial lists)
      try {
        const ko = await summarizeNewsToKorean(
          missing.map((i) => ({ id: i.id, title: i.title, summary: i.summary, source: i.source }))
        )
        for (const k of ko) {
          koById.set(k.id, { titleKo: k.titleKo, summaryKo: k.summaryKo })
        }
      } catch (error) {
        console.error("News summarize retry error:", error)
      }

      missing = baseItems.filter((i) => !koById.has(i.id))
      if (missing.length > 0) {
        console.error("News summarize missing items:", missing.map((m) => m.id))
        return NextResponse.json(
          { error: "뉴스 요약 결과가 일부 누락되었습니다." },
          { status: 500 }
        )
      }
    }

    const result = {
      editionDate,
      news: baseItems.map((i) => ({
        ...i,
        titleKo: koById.get(i.id)?.titleKo || "",
        summaryKo: koById.get(i.id)?.summaryKo || "",
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
