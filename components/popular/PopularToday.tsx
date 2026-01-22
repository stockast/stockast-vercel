"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, Flame } from "lucide-react"

interface PopularStock {
  ticker: string
  name: string
  views: number
  clicks: number
  favorites: number
  engagement: number
}

export function PopularToday() {
  const [loading, setLoading] = useState(true)
  const [popular, setPopular] = useState<{
    topStocks: PopularStock[]
  } | null>(null)

  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const response = await fetch("/api/popular-today")
        const data = await response.json()
        if (response.ok) {
          setPopular(data)
        }
      } catch (error) {
        console.error("Error fetching popular stocks:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPopular()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            오늘 인기 종목
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!popular || popular.topStocks.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          오늘 인기 종목
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {popular.topStocks.slice(0, 10).map((stock, index) => (
          <div
            key={stock.ticker}
            className="flex items-center justify-between py-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 text-sm font-medium text-gray-500">
                {index + 1}
              </span>
              <div>
                <p className="font-medium">{stock.ticker}</p>
                <p className="text-xs text-gray-500">{stock.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <TrendingUp className="h-4 w-4" />
              <span>{stock.engagement.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
