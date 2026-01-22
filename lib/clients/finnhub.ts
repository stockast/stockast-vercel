import axios from "axios"
import { env } from "@/lib/env"

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

export interface StockQuote {
  c: number // Current price
  d: number // Change
  dp: number // Percent change
  h: number // High price of the day
  l: number // Low price of the day
  o: number // Open price of the day
  pc: number // Previous close price
}

export interface NewsArticle {
  category: string
  datetime: number
  headline: string
  id: number
  image: string
  related: string
  source: string
  summary: string
  url: string
}

export interface CompanyProfile {
  country: string
  currency: string
  exchange: string
  ipo: string
  marketCapitalization: number
  name: string
  phone: string
  shareOutstanding: number
  ticker: string
  weburl: string
  logo: string
  finnhubIndustry: string
}

class FinnhubClient {
  private apiKey: string
  private rateLimitDelay: number = 1000 // 60 calls/min = 1 call per second

  constructor() {
    this.apiKey = env.FINNHUB_API_KEY
  }

  private async request<T>(endpoint: string, params: Record<string, string> = {}) {
    const response = await axios.get(`${FINNHUB_BASE_URL}${endpoint}`, {
      params: {
        ...params,
        token: this.apiKey,
      },
    })
    return response.data as T
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async getQuote(symbol: string): Promise<StockQuote | null> {
    await this.delay(this.rateLimitDelay)
    try {
      return await this.request<StockQuote>("/quote", { symbol })
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error)
      return null
    }
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    await this.delay(this.rateLimitDelay)
    try {
      return await this.request<CompanyProfile>("/stock/profile2", { symbol })
    } catch (error) {
      console.error(`Error fetching profile for ${symbol}:`, error)
      return null
    }
  }

  async getCompanyNews(
    symbol: string,
    from: string,
    to: string
  ): Promise<NewsArticle[]> {
    await this.delay(this.rateLimitDelay)
    try {
      return await this.request<NewsArticle[]>("/company-news", {
        symbol,
        from,
        to,
      })
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error)
      return []
    }
  }

  async getGeneralNews(category: string = "general"): Promise<NewsArticle[]> {
    await this.delay(this.rateLimitDelay)
    try {
      return await this.request<NewsArticle[]>("/news", { category })
    } catch (error) {
      console.error("Error fetching general news:", error)
      return []
    }
  }

  async searchSymbol(query: string): Promise<{ count: number; result: Array<{ description: string; displaySymbol: string; symbol: string; type: string }> }> {
    await this.delay(this.rateLimitDelay)
    try {
      return await this.request("/search", { q: query })
    } catch (error) {
      console.error(`Error searching for ${query}:`, error)
      return { count: 0, result: [] }
    }
  }
}

export const finnhub = new FinnhubClient()
