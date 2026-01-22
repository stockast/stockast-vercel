import { db } from "@/lib/db"
import { finnhub, StockQuote, NewsArticle } from "@/lib/clients/finnhub"
import { generateStockBriefing, StockData, NewsItem } from "@/lib/clients/openai"
import { newsScraper } from "@/lib/scrapers/newsScraper"
import crypto from "crypto"

interface DailyBriefingJob {
  date: string
  forceRegenerate?: boolean
}

export async function processDailyBriefing(job: DailyBriefingJob) {
  const { date, forceRegenerate } = job
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)

  console.log(`[Briefing] Starting daily briefing generation for ${date}`)

  // Create or get ingest run record
  const ingestRun = await db.ingestRun.upsert({
    where: { runDate: targetDate },
    create: {
      runDate: targetDate,
      status: "running",
      startedAt: new Date(),
    },
    update: {
      status: "running",
      startedAt: new Date(),
    },
  })

  try {
    // Step 1: Get all active users with their favorite stocks
    const users = await db.user.findMany({
      where: {
        briefings: {
          none: {
            briefingDate: targetDate,
          },
        },
      },
      include: {
        favoriteStocks: {
          include: { stock: true },
          orderBy: { rank: "asc" },
        },
        preferences: true,
      },
    })

    console.log(`[Briefing] Found ${users.length} users to process`)

    let pricesCollected = 0
    let newsCollected = 0
    let summariesGenerated = 0

    // Step 2: Collect all unique stock tickers
    const allTickers = new Set<string>()
    for (const user of users) {
      for (const fs of user.favoriteStocks) {
        allTickers.add(fs.stock.ticker)
      }
    }

    console.log(`[Briefing] Processing ${allTickers.size} unique tickers`)

    // Step 3: Fetch prices and news for all tickers
    const stockDataMap = new Map<string, StockData>()
    const newsByStock = new Map<string, NewsItem[]>()

    for (const ticker of allTickers) {
      try {
        // Fetch quote
        const quote = await finnhub.getQuote(ticker)
        if (quote) {
          const profile = await finnhub.getCompanyProfile(ticker)
          
          stockDataMap.set(ticker, {
            ticker,
            name: profile?.name || ticker,
            price: quote.c,
            change: quote.d,
            changePercent: quote.dp,
          })

          // Store price in database
          const stock = await db.stock.findUnique({
            where: { exchange_ticker: { exchange: "NASDAQ", ticker } },
          })

          if (stock) {
            await db.dailyPrice.upsert({
              where: {
                stockId_tradeDate: {
                  stockId: stock.id,
                  tradeDate: targetDate,
                },
              },
              create: {
                stockId: stock.id,
                tradeDate: targetDate,
                closePrice: quote.c,
                changeAmount: quote.d,
                changePercent: quote.dp,
                openPrice: quote.o,
                highPrice: quote.h,
                lowPrice: quote.l,
              },
              update: {
                closePrice: quote.c,
                changeAmount: quote.d,
                changePercent: quote.dp,
                openPrice: quote.o,
                highPrice: quote.h,
                lowPrice: quote.l,
              },
            })
            pricesCollected++
          }
        }

        // Fetch news (last 7 days)
        const fromDate = new Date(targetDate)
        fromDate.setDate(fromDate.getDate() - 7)

        const news = await finnhub.getCompanyNews(
          ticker,
          fromDate.toISOString().split("T")[0],
          date
        )

        const newsItems: NewsItem[] = news.map((n) => ({
          title: n.headline,
          summary: n.summary,
          source: n.source,
          url: n.url,
          datetime: n.datetime,
        }))

        newsByStock.set(ticker, newsItems)
        newsCollected += newsItems.length

        // Rate limiting (1 request per second for Finnhub free tier)
        await new Promise((resolve) => setTimeout(resolve, 1100))
      } catch (error) {
        console.error(`[Briefing] Error processing ${ticker}:`, error)
      }
    }

    // Step 4: Generate summaries for each user
    for (const user of users) {
      try {
        const userStocks = user.favoriteStocks.map((fs: { stock: { ticker: string; nameEn: string } }) => ({
          ticker: fs.stock.ticker,
          name: fs.stock.nameEn,
          price: 0,
          change: 0,
          changePercent: 0,
        }))

        // Get actual price data from our map
        for (const fs of user.favoriteStocks) {
          const data = stockDataMap.get(fs.stock.ticker)
          if (data) {
            const idx = userStocks.findIndex((s: StockData) => s.ticker === fs.stock.ticker)
            if (idx >= 0) {
              userStocks[idx] = data
            }
          }
        }

        const userNewsByStock = new Map<string, NewsItem[]>()
        for (const fs of user.favoriteStocks) {
          const news = newsByStock.get(fs.stock.ticker) || []
          userNewsByStock.set(fs.stock.ticker, news)
        }

        // Generate briefing
        const content = await generateStockBriefing(userStocks, userNewsByStock, {
          style: (user.preferences?.briefingStyle as "concise" | "detailed") || "concise",
          focus: (user.preferences?.infoPreference as "all" | "price" | "news") || "all",
        })

        // Create fingerprint for idempotency
        const inputFingerprint = crypto
          .createHash("sha256")
          .update(JSON.stringify({ userId: user.id, date, stocks: userStocks.map((s: StockData) => s.ticker) }))
          .digest("hex")

        // Save briefing
        await db.briefing.create({
          data: {
            userId: user.id,
            briefingDate: targetDate,
            content: content as any,
            model: "gpt-4o-mini",
            promptVersion: 1,
            inputFingerprint,
          },
        })

        summariesGenerated++
      } catch (error) {
        console.error(`[Briefing] Error generating briefing for user ${user.id}:`, error)
      }
    }

    // Update ingest run status
    await db.ingestRun.update({
      where: { id: ingestRun.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        pricesCollected,
        newsCollected,
        summariesGenerated,
      },
    })

    console.log(
      `[Briefing] Completed: prices=${pricesCollected}, news=${newsCollected}, summaries=${summariesGenerated}`
    )

    return {
      success: true,
      pricesCollected,
      newsCollected,
      summariesGenerated,
    }
  } catch (error) {
    console.error("[Briefing] Fatal error:", error)

    await db.ingestRun.update({
      where: { id: ingestRun.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    })

    throw error
  }
}
