import { db } from "@/lib/db"
import { finnhub } from "@/lib/clients/finnhub"
import { generateStockBriefing, StockData, NewsItem, BriefingResult } from "@/lib/clients/openai"
import crypto from "crypto"
import { Prisma } from "@prisma/client"

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

interface DailyBriefingJob {
  date: string
  forceRegenerate?: boolean
}

export async function processDailyBriefing(job: DailyBriefingJob) {
  const { date } = job
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

        // Rate limiting is handled inside the Finnhub client
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

        const contentJson = toInputJsonValue(content)

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
            content: contentJson,
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

export async function generateBriefingForUser(params: {
  userId: string
  date: string
  forceRegenerate?: boolean
}) {
  const { userId, date, forceRegenerate } = params
  const targetDate = new Date(date)
  targetDate.setUTCHours(0, 0, 0, 0)

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      favoriteStocks: {
        include: { stock: true },
        orderBy: { rank: "asc" },
      },
      preferences: true,
    },
  })

  if (!user) throw new Error("사용자를 찾을 수 없습니다.")
  if (user.favoriteStocks.length === 0) throw new Error("관심 종목이 없습니다.")

  if (forceRegenerate) {
    await db.briefing.deleteMany({
      where: {
        userId,
        briefingDate: targetDate,
      },
    })
  }

  const tickers = user.favoriteStocks.map((fs) => fs.stock.ticker)
  const stockDataMap = new Map<string, StockData>()
  const newsByStock = new Map<string, NewsItem[]>()

  const fromDate = new Date(targetDate)
  fromDate.setUTCDate(fromDate.getUTCDate() - 7)
  const fromYmd = fromDate.toISOString().split("T")[0]
  const toYmd = date

  for (const ticker of tickers) {
    try {
      const quote = await finnhub.getQuote(ticker)
      const profile = await finnhub.getCompanyProfile(ticker)

      if (quote) {
        stockDataMap.set(ticker, {
          ticker,
          name: profile?.name || ticker,
          price: quote.c,
          change: quote.d,
          changePercent: quote.dp,
        })

        const stock = user.favoriteStocks.find((fs) => fs.stock.ticker === ticker)?.stock
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
        }
      }

      const news = await finnhub.getCompanyNews(ticker, fromYmd, toYmd)
      const newsItems: NewsItem[] = news.map((n) => ({
        title: n.headline,
        summary: n.summary,
        source: n.source,
        url: n.url,
        datetime: n.datetime,
      }))

      newsByStock.set(ticker, newsItems)

      // Rate limiting is handled inside the Finnhub client
    } catch (error) {
      console.error(`[Briefing] Error processing ${ticker}:`, error)
    }
  }

  const userStocks: StockData[] = tickers.map((ticker) => {
    const data = stockDataMap.get(ticker)
    if (data) return data
    const name = user.favoriteStocks.find((fs) => fs.stock.ticker === ticker)?.stock.nameEn || ticker
    return { ticker, name, price: 0, change: 0, changePercent: 0 }
  })

  const userNewsByStock = new Map<string, NewsItem[]>()
  for (const ticker of tickers) {
    userNewsByStock.set(ticker, newsByStock.get(ticker) || [])
  }

  let content: BriefingResult
  let modelUsed = "gpt-4o-mini"
  let promptVersion = 1
  try {
    content = await generateStockBriefing(userStocks, userNewsByStock, {
      style: (user.preferences?.briefingStyle as "concise" | "detailed") || "concise",
      focus: (user.preferences?.infoPreference as "all" | "price" | "news") || "all",
    })
  } catch (error) {
    // Degraded mode: still create a briefing even if OpenAI is unavailable (quota, billing, etc.)
    console.error("[Briefing] OpenAI generate failed, using fallback:", error)
    modelUsed = "fallback"
    promptVersion = 0

    const lines = userStocks.map((s) => {
      const sign = s.changePercent > 0 ? "+" : ""
      return `${s.ticker}: $${s.price.toFixed(2)} (${sign}${s.changePercent.toFixed(2)}%)`
    })

    content = {
      dailySummary: "AI 브리핑 생성이 일시적으로 불가해 기본 정보로 제공됩니다.",
      marketOverview: `관심 종목 기준 가격/등락률만 간단히 정리했습니다.\n${lines.join("\n")}`,
      stockSummaries: userStocks.map((s) => {
        const sign = s.changePercent > 0 ? "+" : ""
        const news = (userNewsByStock.get(s.ticker) || []).slice(0, 2)
        return {
          ticker: s.ticker,
          name: s.name,
          priceContext: `현재가 $${s.price.toFixed(2)} (${sign}${s.change.toFixed(2)}, ${sign}${s.changePercent.toFixed(2)}%)`,
          newsHighlights: news.map((n) => n.title),
          outlook: "AI 분석이 재개되면 전망/요약을 제공할게요.",
        }
      }),
    }
  }

  const inputFingerprint = crypto
    .createHash("sha256")
    .update(JSON.stringify({ userId, date, stocks: tickers }))
    .digest("hex")

  const contentJson = toInputJsonValue(content)

  await db.briefing.upsert({
    where: {
      userId_briefingDate: {
        userId,
        briefingDate: targetDate,
      },
    },
    create: {
      userId,
      briefingDate: targetDate,
      content: contentJson,
      model: modelUsed,
      promptVersion,
      inputFingerprint,
    },
    update: {
      content: contentJson,
      model: modelUsed,
      promptVersion,
      inputFingerprint,
    },
  })

  return { success: true }
}
