'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TrendingUp, Newspaper, BarChart3, ChevronRight, ChevronDown, RefreshCw, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

interface Briefing {
  exists: boolean
  date?: string
  content?: unknown
  message?: string
  nextUpdate?: string
}

interface PopularResponse {
  date: string
  topStocks: Stock[]
  trendingTopics: unknown[]
  asOf: string
}

interface Stock {
  ticker: string
  name: string
  totalEngagement: number
  views: number
  clicks: number
  favorites: number
  engagement: number
  price?: number
  change?: number
  changePercent?: number
}

interface NewsResponse {
  news: NewsItem[]
  asOf: string
}

interface NewsItem {
  id: string
  title: string
  titleKo?: string
  source: string
  url: string
  publishedAt: string
  summary?: string
  summaryKo?: string
  image?: string
}

interface FearGreed {
  value: number
  value_classification: string
  timestamp: string
  asOf: string
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)

  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  return `${Math.floor(diffHours / 24)}일 전`
}

export default function HomePage() {
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [briefingError, setBriefingError] = useState<string | null>(null)
  const [popularStocks, setPopularStocks] = useState<Stock[]>([])
  const [popularAsOf, setPopularAsOf] = useState<string | null>(null)
  const [popularLogosByTicker, setPopularLogosByTicker] = useState<Record<string, string | null>>({})
  const [popularQuotesByTicker, setPopularQuotesByTicker] = useState<Record<string, { price: number; change: number; changePercent: number }>>({})
  const [popularVisibleCount, setPopularVisibleCount] = useState(10)

  const [stockQuery, setStockQuery] = useState('')
  const [stockResults, setStockResults] = useState<Array<{ ticker: string; name: string }>>([])
  const [stockSearching, setStockSearching] = useState(false)
  const [news, setNews] = useState<NewsItem[]>([])
  const [newsAsOf, setNewsAsOf] = useState<string | null>(null)
  const [newsError, setNewsError] = useState<string | null>(null)
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedNews, setExpandedNews] = useState<Record<string, boolean>>({})
  const [briefingRefreshing, setBriefingRefreshing] = useState(false)

  const loadPopularLogos = async (tickers: string[]) => {
    const chunks: string[][] = []
    for (let i = 0; i < tickers.length; i += 10) {
      chunks.push(tickers.slice(i, i + 10))
    }

    for (const chunk of chunks) {
      try {
        const res = await fetch(`/api/stocks/logos?tickers=${encodeURIComponent(chunk.join(','))}`)
        if (!res.ok) continue
        const data = await res.json()
        if (!data?.logos) continue

        const map: Record<string, string | null> = {}
        for (const item of data.logos) {
          if (item?.ticker) map[item.ticker] = item.logoUrl ?? null
        }
        setPopularLogosByTicker((prev) => ({ ...prev, ...map }))
      } catch {
        // ignore
      }
    }
  }

  const loadPopularQuotes = async (tickers: string[]) => {
    const chunks: string[][] = []
    for (let i = 0; i < tickers.length; i += 30) {
      chunks.push(tickers.slice(i, i + 30))
    }

    for (const chunk of chunks) {
      try {
        const res = await fetch(`/api/stocks/quotes?tickers=${encodeURIComponent(chunk.join(','))}`)
        if (!res.ok) continue
        const data = await res.json()
        const next: Record<string, { price: number; change: number; changePercent: number }> = {}
        for (const q of data.quotes || []) {
          if (!q?.ticker) continue
          next[q.ticker] = { price: q.price, change: q.change, changePercent: q.changePercent }
        }
        setPopularQuotesByTicker((prev) => ({ ...prev, ...next }))
      } catch {
        // ignore
      }
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        try {
          const briefingRes = await fetch('/api/briefings/today')
          if (briefingRes.ok) {
            const briefingData = await briefingRes.json()
            setBriefing(briefingData)
          }
        } catch (e) {
          console.error('Briefing fetch error:', e)
        }

        try {
          const popularRes = await fetch('/api/popular-today')
          if (popularRes.ok) {
            const popularData: PopularResponse = await popularRes.json()
            const top = popularData.topStocks?.slice(0, 50) || []
            setPopularStocks(top)
            setPopularVisibleCount(10)
            setPopularAsOf(popularData.asOf)

            // Logos (best-effort)
            const tickers = top.map((s) => s.ticker).filter(Boolean)
            if (tickers.length > 0) {
              void loadPopularLogos(tickers)
              void loadPopularQuotes(tickers)
            }
          }
        } catch (e) {
          console.error('Popular fetch error:', e)
        }

        const newsRes = await fetch('/api/news/latest')
        if (newsRes.ok) {
          const newsData: NewsResponse = await newsRes.json()
          setNews(newsData.news)
          setNewsAsOf(newsData.asOf)
          setNewsError(null)
        } else {
          const payload = await newsRes.json().catch(() => null)
          console.error('News fetch failed:', payload)
          setNews([])
          setNewsAsOf(null)
          setNewsError(payload?.error || '뉴스를 불러올 수 없습니다.')
        }

        const fearGreedRes = await fetch('/api/fear-greed')
        if (fearGreedRes.ok) {
          const fearGreedData = await fearGreedRes.json()
          setFearGreed(fearGreedData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setError(error instanceof Error ? error.message : '데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const q = stockQuery.trim()
    if (q.length < 1) {
      setStockResults([])
      return
    }

    const t = setTimeout(async () => {
      try {
        setStockSearching(true)
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const data = await res.json()
        setStockResults((data.result || []).slice(0, 8))
      } finally {
        setStockSearching(false)
      }
    }, 250)

    return () => clearTimeout(t)
  }, [stockQuery])

  const onPopularScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const remaining = el.scrollHeight - (el.scrollTop + el.clientHeight)
    if (remaining < 120) {
      setPopularVisibleCount((prev) => Math.min(prev + 10, popularStocks.length))
    }
  }

  const refreshBriefing = async () => {
    try {
      setBriefingRefreshing(true)
      setBriefingError(null)
      const response = await fetch(`/api/briefings/today?refresh=true`)
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        const message = data?.detail ? `${data.error}\n${data.detail}` : (data?.error || '브리핑 생성에 실패했습니다.')
        setBriefingError(message)
        return
      }
      setBriefing(data)
    } finally {
      setBriefingRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full rounded-2xl" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-44" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-11 w-full rounded-2xl" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-36 w-full rounded-2xl" />
          </CardContent>
        </Card>
      </div>
    )
  }
  // Keep the Home UI visible; show errors as banners instead of blank screens.

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            오늘의 뉴스레터
          </CardTitle>
        </CardHeader>
        <CardContent>
          {briefing?.exists ? (
            <Link
              href="/briefing"
              className="flex items-center justify-between rounded-2xl border bg-white p-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Newspaper className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">개인화 브리핑이 준비되었습니다</p>
                  <p className="text-xs text-gray-500 truncate">{briefing.date}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Link>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-700">{briefing?.message}</p>
                <p className="text-xs text-gray-500 mt-1">{briefing?.nextUpdate}</p>
              </div>
              {briefingError ? (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 whitespace-pre-line">
                  {briefingError}
                </div>
              ) : null}
              <Button onClick={refreshBriefing} disabled={briefingRefreshing} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                {briefingRefreshing ? '생성 중...' : '지금 생성'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              인기 종목 TOP 50
            </div>
            {popularAsOf && (
              <span className="text-xs text-gray-500">
                {formatTimeAgo(popularAsOf)} 업데이트
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={stockQuery}
                onChange={(e) => setStockQuery(e.target.value)}
                placeholder="종목 검색 (티커/회사명)"
                className="pl-9 h-11 rounded-2xl"
              />
              {(stockSearching || stockResults.length > 0) && stockQuery.trim().length > 0 ? (
                <div className="absolute mt-2 w-full rounded-2xl border bg-white shadow-sm overflow-hidden z-10">
                  {stockResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">검색 중…</div>
                  ) : (
                    <div className="divide-y">
                      {stockResults.map((s) => (
                        <Link
                          key={s.ticker}
                          href={`/popular?q=${encodeURIComponent(s.ticker)}`}
                          className="block px-4 py-3 hover:bg-gray-50"
                          onClick={() => {
                            setStockQuery('')
                            setStockResults([])
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-900">{s.ticker}</span>
                            <span className="text-xs text-gray-500 truncate max-w-[70%]">{s.name}</span>
                          </div>
                        </Link>
                      ))}
                      <Link
                        href={`/popular?q=${encodeURIComponent(stockQuery.trim())}`}
                        className="block px-4 py-3 text-sm text-primary hover:bg-gray-50"
                        onClick={() => {
                          setStockQuery('')
                          setStockResults([])
                        }}
                      >
                        전체 인기 리스트에서 보기
                      </Link>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div
            className="relative rounded-2xl border bg-white max-h-[560px] overflow-auto"
            onScroll={onPopularScroll}
          >
            {popularStocks.slice(0, popularVisibleCount).map((stock, index) => (
              <div
                key={stock.ticker}
                className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-6 text-center text-sm font-bold ${index < 3 ? 'text-gray-900' : 'text-gray-400'}`}>
                    {index + 1}
                  </span>
                  <Avatar className="h-10 w-10 rounded-xl bg-gray-100 border border-gray-200 shrink-0">
                    <AvatarImage src={popularLogosByTicker[stock.ticker] || undefined} alt={stock.ticker} />
                    <AvatarFallback className="text-[10px] font-bold text-gray-600">
                      {stock.ticker.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{stock.name}</p>
                    <p className="text-xs text-gray-500 truncate">{stock.ticker}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-2">
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">
                      {typeof popularQuotesByTicker[stock.ticker]?.price === 'number'
                        ? `$${popularQuotesByTicker[stock.ticker]!.price.toFixed(2)}`
                        : typeof stock.price === 'number'
                          ? `$${stock.price.toFixed(2)}`
                          : '—'}
                    </p>
                    {typeof popularQuotesByTicker[stock.ticker]?.changePercent === 'number' ? (
                      <span
                        className={`text-xs font-semibold tabular-nums ${
                          popularQuotesByTicker[stock.ticker]!.changePercent > 0
                            ? 'text-emerald-600'
                            : popularQuotesByTicker[stock.ticker]!.changePercent < 0
                              ? 'text-red-600'
                              : 'text-gray-500'
                        }`}
                      >
                        {popularQuotesByTicker[stock.ticker]!.changePercent > 0 ? '+' : ''}
                        {popularQuotesByTicker[stock.ticker]!.changePercent.toFixed(2)}%
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}

            {popularVisibleCount < popularStocks.length ? (
              <div className="sticky bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-white/0 pointer-events-none" />
            ) : null}
          </div>
          <div className="mt-3">
            <Button asChild variant="secondary" className="w-full rounded-2xl">
              <Link href="/popular">인기 종목 전체 보기</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              오늘의 주요 뉴스
            </div>
            {newsAsOf && (
              <span className="text-xs text-gray-500">
                {formatTimeAgo(newsAsOf)} 업데이트
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {newsError ? (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {newsError}
            </div>
          ) : null}
          <div className="rounded-2xl border bg-white overflow-hidden divide-y">
            {news.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500">
                오늘의 주요 뉴스를 준비 중입니다.
              </div>
            ) : null}
            {news.map((item) => {
              const expanded = !!expandedNews[item.id]
              return (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">
                        {item.titleKo || item.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.source} · {new Date(item.publishedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="뉴스 요약 펼치기"
                      className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100"
                      onClick={() => setExpandedNews((prev) => ({ ...prev, [item.id]: !expanded }))}
                    >
                      <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {expanded ? (
                    <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700 leading-relaxed">
                      {item.summaryKo || item.summary || '요약을 생성할 수 없습니다.'}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Fear & Greed Index
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fearGreed ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500">Market Sentiment</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">{fearGreed.value}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-900">
                    {fearGreed.value_classification}
                  </span>
                  <p className="mt-2 text-[11px] text-gray-500">
                    마지막 업데이트: {new Date(fearGreed.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="h-3 w-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 via-yellow-300 to-emerald-500" />
                <div
                  className="absolute -top-2 h-7 w-1 rounded-full bg-gray-900 shadow"
                  style={{ left: `calc(${Math.min(100, Math.max(0, fearGreed.value))}% - 2px)` }}
                />
                <div className="mt-2 flex justify-between text-[11px] text-gray-500">
                  <span>극도의 공포</span>
                  <span>중립</span>
                  <span>극도의 탐욕</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-xl border bg-white px-3 py-2">
                  <p className="text-gray-500">0-25</p>
                  <p className="font-semibold text-gray-900">Fear</p>
                </div>
                <div className="rounded-xl border bg-white px-3 py-2">
                  <p className="text-gray-500">26-74</p>
                  <p className="font-semibold text-gray-900">Neutral</p>
                </div>
                <div className="rounded-xl border bg-white px-3 py-2">
                  <p className="text-gray-500">75-100</p>
                  <p className="font-semibold text-gray-900">Greed</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">데이터를 불러올 수 없습니다.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
