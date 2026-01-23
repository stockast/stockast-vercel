-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "phoneVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ko',
    "briefingStyle" TEXT NOT NULL DEFAULT 'concise',
    "infoPreference" TEXT NOT NULL DEFAULT 'all',
    "disclaimerAckAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorite_stocks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'NASDAQ',
    "nameKo" TEXT,
    "nameEn" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_prices" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "tradeDate" DATE NOT NULL,
    "openPrice" DECIMAL(12,2),
    "highPrice" DECIMAL(12,2),
    "lowPrice" DECIMAL(12,2),
    "closePrice" DECIMAL(12,2) NOT NULL,
    "changeAmount" DECIMAL(12,2),
    "changePercent" DECIMAL(8,4),
    "volume" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "canonicalHash" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "summary" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "crawledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_article_stocks" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "relevanceScore" DECIMAL(4,2),

    CONSTRAINT "news_article_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "briefings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "briefingDate" DATE NOT NULL,
    "content" JSONB NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "promptVersion" INTEGER NOT NULL DEFAULT 1,
    "inputFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "briefings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_summaries" (
    "id" TEXT NOT NULL,
    "summaryDate" DATE NOT NULL,
    "content" JSONB NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "promptVersion" INTEGER NOT NULL DEFAULT 1,
    "inputFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_summaries" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "summaryDate" DATE NOT NULL,
    "content" JSONB NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "promptVersion" INTEGER NOT NULL DEFAULT 1,
    "inputFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "stockId" TEXT,
    "articleId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popularity_daily" (
    "id" TEXT NOT NULL,
    "statDate" DATE NOT NULL,
    "stockId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0,
    "totalEngagement" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "popularity_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popular_interests" (
    "id" TEXT NOT NULL,
    "statDate" DATE NOT NULL,
    "topStocks" JSONB NOT NULL,
    "trendingTopics" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "popular_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_runs" (
    "id" TEXT NOT NULL,
    "runDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "pricesCollected" INTEGER NOT NULL DEFAULT 0,
    "newsCollected" INTEGER NOT NULL DEFAULT 0,
    "summariesGenerated" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingest_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_stocks_userId_stockId_key" ON "user_favorite_stocks"("userId", "stockId");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_stocks_userId_rank_key" ON "user_favorite_stocks"("userId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_exchange_ticker_key" ON "stocks"("exchange", "ticker");

-- CreateIndex
CREATE UNIQUE INDEX "daily_prices_stockId_tradeDate_key" ON "daily_prices"("stockId", "tradeDate");

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_url_key" ON "news_articles"("url");

-- CreateIndex
CREATE INDEX "news_articles_publishedAt_idx" ON "news_articles"("publishedAt");

-- CreateIndex
CREATE INDEX "news_articles_source_idx" ON "news_articles"("source");

-- CreateIndex
CREATE UNIQUE INDEX "news_article_stocks_articleId_stockId_key" ON "news_article_stocks"("articleId", "stockId");

-- CreateIndex
CREATE INDEX "briefings_briefingDate_idx" ON "briefings"("briefingDate");

-- CreateIndex
CREATE UNIQUE INDEX "briefings_userId_briefingDate_key" ON "briefings"("userId", "briefingDate");

-- CreateIndex
CREATE UNIQUE INDEX "market_summaries_summaryDate_key" ON "market_summaries"("summaryDate");

-- CreateIndex
CREATE UNIQUE INDEX "stock_summaries_stockId_summaryDate_key" ON "stock_summaries"("stockId", "summaryDate");

-- CreateIndex
CREATE INDEX "user_events_eventType_createdAt_idx" ON "user_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "user_events_userId_createdAt_idx" ON "user_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "popularity_daily_statDate_totalEngagement_idx" ON "popularity_daily"("statDate", "totalEngagement");

-- CreateIndex
CREATE UNIQUE INDEX "popularity_daily_statDate_stockId_key" ON "popularity_daily"("statDate", "stockId");

-- CreateIndex
CREATE UNIQUE INDEX "popular_interests_statDate_key" ON "popular_interests"("statDate");

-- CreateIndex
CREATE UNIQUE INDEX "ingest_runs_runDate_key" ON "ingest_runs"("runDate");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_stocks" ADD CONSTRAINT "user_favorite_stocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_stocks" ADD CONSTRAINT "user_favorite_stocks_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_prices" ADD CONSTRAINT "daily_prices_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_article_stocks" ADD CONSTRAINT "news_article_stocks_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_article_stocks" ADD CONSTRAINT "news_article_stocks_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_events" ADD CONSTRAINT "user_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "popularity_daily" ADD CONSTRAINT "popularity_daily_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
