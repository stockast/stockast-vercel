import { NextResponse } from "next/server"
import { getCached, setCache, TTL } from "@/lib/cache"

export async function GET() {
  try {
    const cacheKey = 'fear_greed_index'

    const cached = await getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const response = await fetch('https://api.alternative.me/fng/?limit=1', {
      headers: {
        'User-Agent': 'Stockast-App/1.0'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch Fear & Greed Index')
    }

    const data = await response.json()

    if (!data.data || data.data.length === 0) {
      throw new Error('No Fear & Greed data available')
    }

    const latest = data.data[0]
  const result = {
    value: parseInt(latest.value),
    value_classification: latest.value_classification,
    timestamp: latest.timestamp,
    asOf: new Date().toISOString(),
  }

    await setCache(cacheKey, result, TTL.FEAR_GREED)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Fear & Greed fetch error:", error)
    return NextResponse.json(
      { error: "Fear & Greed Index를 가져올 수 없습니다." },
      { status: 500 }
    )
  }
}
