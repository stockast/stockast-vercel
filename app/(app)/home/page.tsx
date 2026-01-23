'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, Newspaper, BarChart3 } from 'lucide-react'

interface Briefing {
  exists: boolean
  date?: string
  content?: any
  message?: string
  nextUpdate?: string
}

interface PopularResponse {
  date: string
  topStocks: Stock[]
  trendingTopics: any[]
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
}

interface NewsResponse {
  news: NewsItem[]
  asOf: string
}

interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
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
  const [popularStocks, setPopularStocks] = useState<Stock[]>([])
  const [popularAsOf, setPopularAsOf] = useState<string | null>(null)
  const [news, setNews] = useState<NewsItem[]>([])
  const [newsAsOf, setNewsAsOf] = useState<string | null>(null)
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = localStorage.getItem('stockast_user_id')

        const briefingUrl = userId ? `/api/briefings/today?userId=${userId}` : '/api/briefings/today'
        const briefingRes = await fetch(briefingUrl)
        if (!briefingRes.ok) throw new Error('Failed to fetch briefing')
        const briefingData = await briefingRes.json()
        setBriefing(briefingData)

        const popularRes = await fetch('/api/popular-today')
        if (!popularRes.ok) throw new Error('Failed to fetch popular stocks')
        const popularData: PopularResponse = await popularRes.json()
        setPopularStocks(popularData.topStocks?.slice(0, 50) || [])
        setPopularAsOf(popularData.asOf)

        const newsRes = await fetch('/api/news/latest')
        if (!newsRes.ok) throw new Error('Failed to fetch news')
        const newsData: NewsResponse = await newsRes.json()
        setNews(newsData.news)
        setNewsAsOf(newsData.asOf)

        const fearGreedRes = await fetch('/api/fear-greed')
        if (!fearGreedRes.ok) throw new Error('Failed to fetch Fear & Greed index')
        const fearGreedData = await fearGreedRes.json()
        setFearGreed(fearGreedData)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError(error instanceof Error ? error.message : '데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
      </div>
    )
  }
  if (error) return <div className="flex justify-center items-center h-64 text-red-500">{error}</div>

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            오늘의 뉴스레터
          </CardTitle>
        </CardHeader>
        <CardContent>
          {briefing?.exists ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">{briefing.date}</p>
              <p className="text-sm">개인화된 주식 브리핑이 준비되었습니다.</p>
              <Link href="/briefing">
                <Button>자세히 보기</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">{briefing?.message}</p>
              <p className="text-sm">{briefing?.nextUpdate}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {popularStocks.map((stock, index) => (
              <div key={stock.ticker} className="text-center p-2 border rounded">
                <div className="text-xs text-gray-500">#{index + 1}</div>
                <div className="font-medium">{stock.ticker}</div>
                <div className="text-xs text-gray-500">{stock.name}</div>
                <div className="w-8 h-8 bg-gray-200 rounded mx-auto mt-1"></div>
              </div>
            ))}
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
          <div className="space-y-3">
            {news.map((item) => (
              <div key={item.id} className="border-l-4 border-primary pl-4 py-2">
                <h3 className="font-medium text-sm">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.source} • {new Date(item.publishedAt).toLocaleDateString()}</p>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                  자세히 보기
                </a>
              </div>
            ))}
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
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{fearGreed.value}</div>
              <div className="text-lg mb-2">{fearGreed.value_classification}</div>
              <div className="text-xs text-gray-500">
                마지막 업데이트: {new Date(fearGreed.timestamp).toLocaleString()}
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
