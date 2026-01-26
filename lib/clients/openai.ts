import OpenAI from "openai"
import { env } from "@/lib/env"

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
})

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export interface StockData {
  ticker: string
  name: string
  price: number
  change: number
  changePercent: number
}

export interface NewsItem {
  title: string
  summary: string
  source: string
  url: string
  datetime: number
}

export interface BriefingResult extends Record<string, unknown> {
  marketOverview: string
  stockSummaries: Array<{
    ticker: string
    name: string
    priceContext: string
    newsHighlights: string[]
    outlook: string
  }>
  dailySummary: string
}

export interface NewsKoreanItem {
  id: string
  titleKo: string
  summaryKo: string
}

export async function summarizeNewsToKorean(
  items: Array<{ id: string; title: string; summary?: string; source?: string }>
): Promise<NewsKoreanItem[]> {
  if (items.length === 0) return []

  const model = env.OPENAI_MODEL

  const systemPrompt = `당신은 한국어 뉴스 편집자입니다.

요구사항:
- 어떤 언어로 들어오든지 한국어로 자연스럽게 번역/요약
- 과장 금지, 사실 중심
- 제목은 30자 이내
- 요약은 1000자 이내 (최대 3문장)
- 투자 조언 금지
- 출력은 JSON만`

  const userPrompt = `다음 뉴스 목록을 한국어로 제목/요약을 만들어주세요.

입력 JSON:
${JSON.stringify(items)}

출력 형식(JSON):
{
  "items": [
    { "id": "...", "titleKo": "...", "summaryKo": "..." }
  ]
}`

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 1500,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("No response from OpenAI")

  const parsed = safeJsonParse<{ items?: NewsKoreanItem[] }>(content)
  if (!parsed) {
    throw new Error("Invalid JSON from OpenAI")
  }
  if (!Array.isArray(parsed.items)) return []

  return parsed.items.map((i) => ({
    ...i,
    titleKo: (i.titleKo || "").slice(0, 30),
    summaryKo: (i.summaryKo || "").slice(0, 1000),
  }))
}

export async function generateStockBriefing(
  stockData: StockData[],
  newsByStock: Map<string, NewsItem[]>,
  userPreferences: {
    style: "concise" | "detailed"
    focus: "all" | "price" | "news"
  }
): Promise<BriefingResult> {
  const model = env.OPENAI_MODEL
  
  const stockContext = stockData
    .map((s) => {
      const news = newsByStock.get(s.ticker) || []
      return `
## ${s.ticker} (${s.name})
- 현재가: $${s.price.toFixed(2)} (${s.change >= 0 ? "+" : ""}${s.change.toFixed(2)}, ${s.changePercent.toFixed(2)}%)
- 주요 뉴스 (${news.length}건):
${news.slice(0, 3).map((n) => `  - ${n.title}`).join("\n")}
`
    })
    .join("\n")

  const styleInstruction =
    userPreferences.style === "concise"
      ? "최대 3개의 핵심 포인트로 요약하세요."
      : "상세한 분석과 함께 여러 포인트를 포함하세요."

  const focusInstruction =
    userPreferences.focus === "price"
      ? "주가 변동에 초점을 맞추어 분석하세요."
      : userPreferences.focus === "news"
        ? "뉴스 내용에 초점을 맞추어 분석하세요."
        : "주가와 뉴스 모두를 균형 있게 분석하세요."

  const systemPrompt = `당신은 전문적인 금융 분석가입니다. 미국 주식 브리핑을 작성합니다.

요구사항:
- Toss 앱 스타일: 깔끔하고 간결한 한국어
- 이모지 사용: 📈 (상승), 📉 (하락), ⚠️ (주의)
- 투자 조언 금지
- 객관적 정보 제공
- ${styleInstruction}
- ${focusInstruction}`

  const userPrompt = `오늘의 미국 주식 브리핑을 작성해주세요.

### 시장 데이터
${stockContext}

### 작성 형식
JSON으로 출력:
{
  "marketOverview": "시장 전체動向 요약 (2-3문장)",
  "stockSummaries": [
    {
      "ticker": "심볼",
      "name": "회사명",
      "priceContext": "주가 상황 간단 설명",
      "newsHighlights": ["뉴스 하이라이트 1", "뉴스 하이라이트 2"],
      "outlook": "단기 전망 (1-2문장)"
    }
  ],
  "dailySummary": "오늘의 핵심 요약 (1문장)"
}`

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("No response from OpenAI")
    }

    const parsed = safeJsonParse<BriefingResult>(content)
    if (!parsed) {
      throw new Error("Invalid JSON from OpenAI")
    }
    return parsed
  } catch (error) {
    console.error("Error generating briefing:", error)
    throw error
  }
}

export async function generateMarketSummary(
  marketData: {
    sp500Change: number
    nasdaqChange: number
    dowJonesChange: number
    topGainers: Array<{ ticker: string; change: number }>
    topLosers: Array<{ ticker: string; change: number }>
  }
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content: `당신은 금융 전문가입니다. 오늘의 미국 시장動向을 3-4문장으로 요약하세요.
        - 객관적 사실 중심
        - 한국어
        - 깔끔한 문장
        - 이모지 적절히 사용`,
      },
      {
        role: "user",
        content: `
S&P 500: ${marketData.sp500Change >= 0 ? "+" : ""}${marketData.sp500Change.toFixed(2)}%
NASDAQ: ${marketData.nasdaqChange >= 0 ? "+" : ""}${marketData.nasdaqChange.toFixed(2)}%
Dow Jones: ${marketData.dowJonesChange >= 0 ? "+" : ""}${marketData.dowJonesChange.toFixed(2)}%

상승 TOP 3: ${marketData.topGainers.map((s) => `${s.ticker}(${s.change >= 0 ? "+" : ""}${s.change.toFixed(2)}%)`).join(", ")}
하락 TOP 3: ${marketData.topLosers.map((s) => `${s.ticker}(${s.change >= 0 ? "+" : ""}${s.change.toFixed(2)}%)`).join(", ")}

시장 요약 작성`,
      },
    ],
    temperature: 0.5,
    max_tokens: 500,
  })

  return response.choices[0]?.message?.content || "시장 데이터를 불러올 수 없습니다."
}

export { openai }
