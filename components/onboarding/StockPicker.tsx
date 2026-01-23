"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Search, Loader2, TrendingUp, DollarSign } from "lucide-react"

interface Stock {
  ticker: string
  name: string
}

const LOGO_BY_TICKER: Record<string, string> = {
  AAPL: "https://logo.clearbit.com/apple.com",
  GOOGL: "https://logo.clearbit.com/google.com",
  MSFT: "https://logo.clearbit.com/microsoft.com",
  AMZN: "https://logo.clearbit.com/amazon.com",
  NVDA: "https://logo.clearbit.com/nvidia.com",
  TSLA: "https://logo.clearbit.com/tesla.com",
  META: "https://logo.clearbit.com/meta.com",
  "BRK.B": "https://logo.clearbit.com/berkshirehathaway.com",
}

interface StockPickerProps {
  selected: Stock[]
  onChange: (stocks: Stock[]) => void
  max: number
}

const TRENDING_STOCKS = [
  { ticker: "AAPL", name: "Apple" },
  { ticker: "NVDA", name: "NVIDIA" },
  { ticker: "TSLA", name: "Tesla" },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "GOOGL", name: "Alphabet" },
  { ticker: "AMZN", name: "Amazon" },
  { ticker: "META", name: "Meta" },
  { ticker: "BRK.B", name: "Berkshire" },
]

const MARKET_CAP_STOCKS: Array<Stock & { marketCapTrillionUsd: number }> = [
  { ticker: "NVDA", name: "NVIDIA", marketCapTrillionUsd: 4.4 },
  { ticker: "AAPL", name: "Apple", marketCapTrillionUsd: 3.6 },
  { ticker: "MSFT", name: "Microsoft", marketCapTrillionUsd: 3.4 },
  { ticker: "AMZN", name: "Amazon", marketCapTrillionUsd: 2.3 },
  { ticker: "GOOGL", name: "Alphabet", marketCapTrillionUsd: 1.9 },
  { ticker: "META", name: "Meta", marketCapTrillionUsd: 1.7 },
  { ticker: "TSLA", name: "Tesla", marketCapTrillionUsd: 1.4 },
  { ticker: "BRK.B", name: "Berkshire", marketCapTrillionUsd: 1.0 },
]

function formatTrillionUsd(value: number) {
  return `${value.toFixed(1)}조달러`
}

export function StockPicker({ selected, onChange, max }: StockPickerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Stock[]>([])
  const [loading, setLoading] = useState(false)
  const [quotes, setQuotes] = useState<Record<string, { price: number; changePercent: number }>>({})

  const searchStocks = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setSearchResults(data.result || [])
    } catch (error) {
      console.error("Search error:", error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleAddStock = (stock: Stock) => {
    if (selected.length >= max) return
    if (selected.some((s) => s.ticker === stock.ticker)) return
    onChange([...selected, stock])
    setSearchQuery("")
    setSearchResults([])
  }

  const handleRemoveStock = (ticker: string) => {
    onChange(selected.filter((s) => s.ticker !== ticker))
  }

  const marketCapTickers = useMemo(() => MARKET_CAP_STOCKS.map((s) => s.ticker).join(","), [])

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await fetch(`/api/stocks/quotes?tickers=${encodeURIComponent(marketCapTickers)}`)
        if (!res.ok) return
        const data = await res.json()
        const map: Record<string, { price: number; changePercent: number }> = {}
        for (const q of data.quotes || []) {
          map[q.ticker] = { price: q.price, changePercent: q.changePercent }
        }
        setQuotes(map)
      } catch {
        // ignore
      }
    }

    fetchQuotes()
  }, [marketCapTickers])

  return (
    <div className="space-y-4">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((stock) => (
            <div
              key={stock.ticker}
              className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-full text-sm"
            >
              <span className="font-medium">{stock.ticker}</span>
              <span className="text-primary/70">{stock.name}</span>
              <button
                onClick={() => handleRemoveStock(stock.ticker)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="sticky top-0 z-10 bg-gray-50 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="주식 코드 또는 회사명 검색"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              searchStocks(e.target.value)
            }}
            disabled={selected.length >= max}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        {loading && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}
        {searchResults.length > 0 && (
          <Card className="mt-2 max-h-56 overflow-auto rounded-2xl">
            {searchResults.map((stock) => (
              <button
                key={stock.ticker}
                onClick={() => handleAddStock(stock)}
                disabled={selected.length >= max || selected.some((s) => s.ticker === stock.ticker)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{stock.ticker}</div>
                  <div className="text-sm text-gray-500 truncate">{stock.name}</div>
                </div>
                <span className="text-xs text-gray-400">추가</span>
              </button>
            ))}
          </Card>
        )}
      </div>

      <Tabs defaultValue="trending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1">
          <TabsTrigger value="trending" className="flex items-center gap-1 text-xs sm:text-sm">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            요즘 핫한 종목
          </TabsTrigger>
          <TabsTrigger value="market-cap" className="flex items-center gap-1 text-xs sm:text-sm">
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
            시가총액
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trending" className="space-y-2">
          <div className="space-y-2">
            {TRENDING_STOCKS.map((stock) => {
              const disabled = selected.length >= max || selected.some((s) => s.ticker === stock.ticker)
              return (
                <button
                  key={stock.ticker}
                  type="button"
                  onClick={() => handleAddStock(stock)}
                  disabled={disabled}
                  className="w-full flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left disabled:opacity-50"
                >
                  <div className="h-10 w-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                    <img
                      src={LOGO_BY_TICKER[stock.ticker]}
                      alt=""
                      className="h-10 w-10 object-cover"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                      }}
                    />
                    <span className="text-xs font-semibold text-gray-600">{stock.ticker[0]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{stock.name}</div>
                    <div className="text-sm text-gray-500 truncate">{stock.ticker}</div>
                  </div>
                  <span className="text-xs text-gray-400">추가</span>
                </button>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="market-cap" className="space-y-2">
          <Card className="rounded-2xl overflow-hidden">
            {MARKET_CAP_STOCKS.map((stock) => {
              const disabled = selected.length >= max || selected.some((s) => s.ticker === stock.ticker)
              const q = quotes[stock.ticker]
              const pct = q?.changePercent
              const pctColor = pct === undefined ? "text-gray-500" : pct >= 0 ? "text-emerald-600" : "text-red-600"
              return (
                <button
                  key={stock.ticker}
                  type="button"
                  onClick={() => handleAddStock(stock)}
                  disabled={disabled}
                  className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                      <img
                        src={LOGO_BY_TICKER[stock.ticker]}
                        alt=""
                        className="h-10 w-10 object-cover"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <span className="text-xs font-semibold text-gray-600">{stock.ticker[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{stock.name}</div>
                      <div className="text-sm text-gray-500 truncate">{formatTrillionUsd(stock.marketCapTrillionUsd)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">{q ? `${q.price.toFixed(2)}달러` : "—"}</div>
                    <div className={`text-xs ${pctColor}`}>{pct === undefined ? "—" : `${pct.toFixed(2)}%`}</div>
                  </div>
                </button>
              )
            })}
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-center text-gray-500">
        {selected.length} / {max} 선택됨
      </p>
    </div>
  )
}
