import { chromium, Browser } from "playwright"
import { db } from "@/lib/db"
import crypto from "crypto"

interface ScrapedArticle {
  title: string
  url: string
  source: string
  publishedAt: Date
  content: string
  summary?: string
}

class NewsScraper {
  private browser: Browser | null = null
  private readonly sources = [
    {
      name: "Yahoo Finance",
      url: (symbol: string) => `https://finance.yahoo.com/quote/${symbol}`,
      selector: "h3MbKZe",
    },
    {
      name: "Google Finance",
      url: (symbol: string) => `https://www.google.com/finance/quote/${symbol}:NASDAQ`,
      selector: "Yfwt5",
    },
  ]

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
    }
    return this.browser
  }

  private async closeBrowser() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  private generateCanonicalHash(content: string): string {
    return crypto.createHash("sha256").update(content.slice(0, 500)).digest("hex")
  }

  async scrapeStockNews(
    symbol: string,
    fromDate: Date,
    toDate: Date
  ): Promise<ScrapedArticle[]> {
    const articles: ScrapedArticle[] = []

    try {
      const browser = await this.getBrowser()
      const page = await browser.newPage()

      // Scrape Yahoo Finance
      try {
        const yahooArticles = await this.scrapeYahooFinance(
          page,
          symbol,
          fromDate,
          toDate
        )
        articles.push(...yahooArticles)
      } catch (error) {
        console.error(`Error scraping Yahoo Finance for ${symbol}:`, error)
      }

      await page.close()
    } catch (error) {
      console.error("Browser error:", error)
    }

    return articles
  }

  private async scrapeYahooFinance(
    page: any,
    symbol: string,
    fromDate: Date,
    toDate: Date
  ): Promise<ScrapedArticle[]> {
    const articles: ScrapedArticle[] = []

    await page.goto(`https://finance.yahoo.com/quote/${symbol}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    })

    // Scroll to load more news
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2)
    })
    await page.waitForTimeout(2000)

    // Extract news articles
    const newsItems = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll("h3"))
        .slice(0, 10)
        .map((item) => ({
          title: item.textContent?.trim() || "",
          url: item.closest("a")?.href || "",
        }))
        .filter((item) => item.title && item.url)
      return items
    })

    for (const item of newsItems) {
      try {
        const browserInstance = await this.getBrowser()
        const articlePage = await browserInstance.newPage()
        await articlePage.goto(item.url, {
          waitUntil: "networkidle",
          timeout: 15000,
        })

        const content = await articlePage.evaluate(() => {
          const paragraphs = document.querySelectorAll("p")
          return Array.from(paragraphs)
            .map((p) => p.textContent?.trim())
            .filter(Boolean)
            .join(" ")
            .slice(0, 1000)
        })

        articles.push({
          title: item.title,
          url: item.url,
          source: "Yahoo Finance",
          publishedAt: new Date(),
          content,
          summary: content.slice(0, 200),
        })

        await articlePage.close()
      } catch (error) {
        console.error("Error extracting article:", error)
      }
    }

    return articles
  }

  async saveArticles(
    articles: ScrapedArticle[],
    stockId: string
  ): Promise<number> {
    let savedCount = 0

    for (const article of articles) {
      try {
        // Check for duplicate by URL
        const existing = await db.newsArticle.findUnique({
          where: { url: article.url },
        })

        if (existing) continue

        // Create article
        const created = await db.newsArticle.create({
          data: {
            source: article.source,
            url: article.url,
            canonicalHash: this.generateCanonicalHash(article.content),
            title: article.title,
            content: article.content,
            summary: article.summary,
            publishedAt: article.publishedAt,
          },
        })

        // Link to stock
        await db.newsArticleStock.create({
          data: {
            articleId: created.id,
            stockId,
            relevanceScore: 1.0,
          },
        })

        savedCount++
      } catch (error) {
        console.error("Error saving article:", error)
      }
    }

    return savedCount
  }

  async cleanup() {
    await this.closeBrowser()
  }
}

export const newsScraper = new NewsScraper()
