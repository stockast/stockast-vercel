"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, Clock, Star } from "lucide-react"
import { PopularToday } from "@/components/popular/PopularToday"

interface BriefingContent {
  marketOverview: string
  stockSummaries: Array<{
    ticker: string
    name: string
    priceContext: string
    newsHighlights: string[]
    outlook: string
  }>
  dailySummary: string
}

export default function BriefingPage() {
  const [loading, setLoading] = useState(true)
  const [briefing, setBriefing] = useState<{
    exists: boolean
    date: string
    content: BriefingContent
    stocks: Array<{ ticker: string; name: string; rank: number }>
    message?: string
    nextUpdate?: string
    generatedAt?: string
  } | null>(null)
  const [error, setError] = useState("")

  const fetchBriefing = async (opts?: { refresh?: boolean; force?: boolean }) => {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (opts?.refresh) params.set("refresh", "true")
      if (opts?.force) params.set("force", "true")

      const response = await fetch(`/api/briefings/today?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "브리핑을 불러올 수 없습니다.")
      }

      setBriefing(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBriefing()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/onboarding">온보딩으로</Link>
            </Button>
            <Button onClick={() => fetchBriefing()} className="flex-1">다시 시도</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!briefing?.exists) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
            <Clock className="h-7 w-7 text-primary" />
          </div>
          <CardTitle>아직 브리핑이 없어요</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            {briefing?.message || "오늘의 브리핑을 준비하고 있습니다."}
          </p>
          <p className="text-sm text-gray-500">
            {briefing?.nextUpdate || "매일 오전 8시 30분에 업데이트됩니다."}
          </p>
          <Button onClick={() => fetchBriefing({ refresh: true })} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            생성 요청
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">오늘의 브리핑</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(briefing.date).toLocaleDateString("ko-KR", {
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
        </div>
        <Button variant="secondary" onClick={() => fetchBriefing({ refresh: true })}>
          <RefreshCw className="mr-2 h-4 w-4" />
          새로고침
        </Button>
      </div>
        {/* Daily Summary */}
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-6">
            <p className="text-lg font-semibold text-gray-900">{briefing.content.dailySummary}</p>
          </CardContent>
        </Card>

        {/* Market Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">시장 개요</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">
              {briefing.content.marketOverview}
            </p>
          </CardContent>
        </Card>

        {/* Stock Summaries */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">관심 종목</h2>
          
          {briefing.content.stockSummaries.map((stock) => (
            <Card key={stock.ticker}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{stock.ticker}</CardTitle>
                    <p className="text-sm text-gray-500">{stock.name}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Star className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-700">{stock.priceContext}</p>
                
                {stock.newsHighlights.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      주요 뉴스
                    </p>
                    <ul className="space-y-1">
                      {stock.newsHighlights.map((news, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-600 flex items-start gap-2"
                        >
                          <span className="text-primary">•</span>
                          {news}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600">{stock.outlook}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Popular Today */}
        <PopularToday />

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-500 pt-4">
          <p>브리핑 생성: {briefing.generatedAt ? new Date(briefing.generatedAt).toLocaleTimeString("ko-KR") : "준비중"}</p>
          <p className="mt-1">매일 오전 8시 30분에 새로운 브리핑을 받아보세요</p>
        </div>
    </div>
  )
}
