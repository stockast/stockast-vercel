import { db } from "@/lib/db"

interface PopularityJobData {
  date: string
}

export async function aggregatePopularity(job: PopularityJobData) {
  const { date } = job
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)

  console.log(`[Popularity] Starting aggregation for ${date}`)

  try {
    // Get all unique stocks that had activity today
    const activeStocks = await db.userEvent.findMany({
      where: {
        createdAt: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
        },
        stockId: { not: null },
      },
      distinct: ["stockId"],
      select: { stockId: true },
    })

    console.log(`[Popularity] Found ${activeStocks.length} active stocks`)

    const results: Array<{
      ticker: string
      name: string
      views: number
      clicks: number
      favorites: number
      totalEngagement: number
    }> = []

    for (const { stockId } of activeStocks) {
      if (!stockId) continue

      // Count events for this stock
      const [views, clicks, favEvents] = await Promise.all([
        db.userEvent.count({
          where: {
            stockId,
            eventType: "view",
            createdAt: {
              gte: targetDate,
              lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        }),
        db.userEvent.count({
          where: {
            stockId,
            eventType: "click",
            createdAt: {
              gte: targetDate,
              lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        }),
        db.userEvent.count({
          where: {
            stockId,
            eventType: "favorite",
            createdAt: {
              gte: targetDate,
              lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        }),
      ])

      // Get stock info
      const stock = await db.stock.findUnique({
        where: { id: stockId },
        select: { ticker: true, nameEn: true },
      })

       if (stock) {
        const totalEngagement = views + clicks * 2 + favEvents * 3
        results.push({
          ticker: stock.ticker,
          name: stock.nameEn,
          views,
          clicks,
          favorites: favEvents,
          totalEngagement,
        })

        // Upsert daily popularity
        await db.popularityDaily.upsert({
          where: {
            statDate_stockId: {
              statDate: targetDate,
              stockId,
            },
          },
          create: {
            statDate: targetDate,
            stockId,
            views,
            clicks,
            favorites: favEvents,
            totalEngagement,
          },
          update: {
            views,
            clicks,
            favorites: favEvents,
            totalEngagement,
          },
        })
      }
    }

    // Sort by engagement and get top 50
    const topStocks = results
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 50)
      .map((s, i) => ({
        rank: i + 1,
        ticker: s.ticker,
        name: s.name,
        views: s.views,
        clicks: s.clicks,
        favorites: s.favorites,
        totalEngagement: s.totalEngagement,
      }))

    // Create PopularInterest record
    await db.popularInterest.upsert({
      where: { statDate: targetDate },
      create: {
        statDate: targetDate,
        topStocks,
        trendingTopics: [], // TODO: Implement topic extraction
      },
      update: {
        topStocks,
        trendingTopics: [],
      },
    })

    console.log(`[Popularity] Completed: ${results.length} stocks processed, ${topStocks.length} in top list`)

    return {
      success: true,
      stocksProcessed: results.length,
      topStocksCount: topStocks.length,
    }
  } catch (error) {
    console.error("[Popularity] Error:", error)
    throw error
  }
}
