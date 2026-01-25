"use client"

import { useEffect, useState } from "react"
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

    const userId = localStorage.getItem("stockast_user_id")
    if (!userId) {
      setError("로그인이 필요합니다.")
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams({ userId })
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
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
             <Button onClick={() => fetchBriefing()}>다시 시도</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!briefing?.exists) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-primary" />
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
              새로고침
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">오늘의 브리핑</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {new Date(briefing.date).toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="브리핑 새로고침"
              onClick={() => fetchBriefing({ refresh: true })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Daily Summary */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-6">
            <p className="text-lg font-medium">{briefing.content.dailySummary}</p>
          </CardContent>
        </Card>

        {/* Market Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">시장 개요</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">
              {briefing.content.marketOverview}
            </p>
          </CardContent>
        </Card>

        {/* Stock Summaries */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">관심 종목</h2>
          
          {briefing.content.stockSummaries.map((stock) => (
            <Card key={stock.ticker}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{stock.ticker}</CardTitle>
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
      </main>
    </div>
  )
}
