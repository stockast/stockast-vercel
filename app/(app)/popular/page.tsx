"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search } from "lucide-react"

type Stock = {
  ticker: string
  name: string
  price?: number
  change?: number
  changePercent?: number
}

type PopularResponse = {
  topStocks: Stock[]
  asOf?: string
}

function pctClass(pct?: number) {
  if (typeof pct !== "number") return "text-gray-500"
  if (pct > 0) return "text-emerald-600"
  if (pct < 0) return "text-red-600"
  return "text-gray-500"
}

export default function PopularPage() {
  const searchParams = useSearchParams()
  const initialQ = searchParams.get("q") || ""

  const [query, setQuery] = useState(initialQ)
  const [popularStocks, setPopularStocks] = useState<Stock[]>([])
  const [logosByTicker, setLogosByTicker] = useState<Record<string, string | null>>({})
  const [quotesByTicker, setQuotesByTicker] = useState<
    Record<string, { price: number; change: number; changePercent: number }>
  >({})
  const [loading, setLoading] = useState(true)

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (!q) return popularStocks
    return popularStocks.filter((s) => s.ticker.toUpperCase().includes(q) || s.name.toUpperCase().includes(q))
  }, [popularStocks, query])

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/popular-today")
        if (!res.ok) return
        const data: PopularResponse = await res.json()
        const top = data.topStocks?.slice(0, 50) || []
        setPopularStocks(top)

        const tickers = top.map((s) => s.ticker).filter(Boolean)
        if (tickers.length === 0) return

        // logos: 10 at a time (finnhub free tier)
        for (let i = 0; i < tickers.length; i += 10) {
          const chunk = tickers.slice(i, i + 10)
          try {
            const r = await fetch(`/api/stocks/logos?tickers=${encodeURIComponent(chunk.join(","))}`)
            if (r.ok) {
              const payload = await r.json()
              const map: Record<string, string | null> = {}
              for (const item of payload.logos || []) {
                if (item?.ticker) map[item.ticker] = item.logoUrl ?? null
              }
              setLogosByTicker((prev) => ({ ...prev, ...map }))
            }
          } catch {
            // ignore
          }
        }

        // quotes: 30 at a time
        for (let i = 0; i < tickers.length; i += 30) {
          const chunk = tickers.slice(i, i + 30)
          try {
            const r = await fetch(`/api/stocks/quotes?tickers=${encodeURIComponent(chunk.join(","))}`)
            if (r.ok) {
              const payload = await r.json()
              const map: Record<string, { price: number; change: number; changePercent: number }> = {}
              for (const q of payload.quotes || []) {
                if (!q?.ticker) continue
                map[q.ticker] = { price: q.price, change: q.change, changePercent: q.changePercent }
              }
              setQuotesByTicker((prev) => ({ ...prev, ...map }))
            }
          } catch {
            // ignore
          }
        }
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">인기 종목 TOP 50</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="종목 검색 (티커/회사명)"
              className="pl-9 h-11 rounded-2xl"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-2xl border bg-white overflow-hidden">
            {loading
              ? Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="px-4 py-3 border-b last:border-b-0">
                    <div className="h-10 bg-gray-100 rounded-xl" />
                  </div>
                ))
              : filtered.slice(0, 50).map((stock, index) => {
                  const quote = quotesByTicker[stock.ticker]
                  const price = typeof quote?.price === "number" ? quote.price : stock.price
                  const pct = typeof quote?.changePercent === "number" ? quote.changePercent : stock.changePercent

                  return (
                    <div
                      key={stock.ticker}
                      className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-gray-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-7 text-center text-sm font-bold ${
                            index < 3 ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <Avatar className="h-10 w-10 rounded-xl bg-gray-100 border border-gray-200 shrink-0">
                          <AvatarImage src={logosByTicker[stock.ticker] || undefined} alt={stock.ticker} />
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
                            {typeof price === "number" ? `$${price.toFixed(2)}` : "—"}
                          </p>
                          {typeof pct === "number" ? (
                            <span className={`text-xs font-semibold tabular-nums ${pctClass(pct)}`}>
                              {pct > 0 ? "+" : ""}
                              {pct.toFixed(2)}%
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
