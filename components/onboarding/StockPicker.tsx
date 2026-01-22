"use client"

import { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Search, Loader2 } from "lucide-react"

interface Stock {
  ticker: string
  name: string
}

interface StockPickerProps {
  selected: Stock[]
  onChange: (stocks: Stock[]) => void
  max: number
}

const POPULAR_STOCKS = [
  { ticker: "AAPL", name: "Apple" },
  { ticker: "GOOGL", name: "Alphabet" },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "AMZN", name: "Amazon" },
  { ticker: "NVDA", name: "NVIDIA" },
  { ticker: "TSLA", name: "Tesla" },
  { ticker: "META", name: "Meta" },
  { ticker: "BRK.B", name: "Berkshire" },
]

export function StockPicker({ selected, onChange, max }: StockPickerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Stock[]>([])
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="space-y-4">
      {/* Selected Stocks */}
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

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="주식 코드 또는 회사명 검색 (예: AAPL, Apple)"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            searchStocks(e.target.value)
          }}
          disabled={selected.length >= max}
          className="pl-10"
        />
      </div>

      {/* Search Results */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {searchResults.length > 0 && (
        <Card className="max-h-48 overflow-auto">
          {searchResults.map((stock) => (
            <button
              key={stock.ticker}
              onClick={() => handleAddStock(stock)}
              disabled={selected.length >= max || selected.some((s) => s.ticker === stock.ticker)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div>
                <div className="font-medium">{stock.ticker}</div>
                <div className="text-sm text-gray-500">{stock.name}</div>
              </div>
              {selected.some((s) => s.ticker === stock.ticker) ? (
                <span className="text-xs text-primary font-medium">선택됨</span>
              ) : (
                <span className="text-xs text-gray-400">추가</span>
              )}
            </button>
          ))}
        </Card>
      )}

      {/* Popular Stocks */}
      {!searchQuery && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">인기 종목</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_STOCKS.filter((s) => !selected.some((sel) => sel.ticker === s.ticker)).map((stock) => (
              <Button
                key={stock.ticker}
                variant="outline"
                size="sm"
                onClick={() => handleAddStock(stock)}
                disabled={selected.length >= max}
              >
                {stock.ticker}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Counter */}
      <p className="text-xs text-center text-gray-500">
        {selected.length} / {max} 선택됨
      </p>
    </div>
  )
}
