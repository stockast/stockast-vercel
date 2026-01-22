import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, phone, favorites, preferences } = body

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { error: "이름과 이메일은 필수 입력 항목입니다." },
        { status: 400 }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "올바른 이메일 형식을 입력해주세요." },
        { status: 400 }
      )
    }

    if (!favorites || favorites.length === 0) {
      return NextResponse.json(
        { error: "최소 1개 이상의 관심 종목을 선택해주세요." },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다." },
        { status: 409 }
      )
    }

    // Create user and related data in transaction
    const user = await db.$transaction(async (tx: any) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          phone: phone || null,
        },
      })

      // Create preferences
      await tx.userPreference.create({
        data: {
          userId: newUser.id,
          language: "ko",
          briefingStyle: preferences?.style || "concise",
          infoPreference: preferences?.focus || "all",
        },
      })

      // Create favorite stocks
      for (let i = 0; i < favorites.length; i++) {
        const fav = favorites[i]
        
        // Find or create stock
        let stock = await tx.stock.findUnique({
          where: { exchange_ticker: { exchange: "NASDAQ", ticker: fav.ticker } },
        })

        if (!stock) {
          stock = await tx.stock.create({
            data: {
              ticker: fav.ticker,
              nameEn: fav.name,
              exchange: "NASDAQ",
            },
          })
        }

        await tx.userFavoriteStock.create({
          data: {
            userId: newUser.id,
            stockId: stock.id,
            rank: i + 1,
          },
        })
      }

      return newUser
    })

    return NextResponse.json({
      success: true,
      userId: user.id,
      message: "회원가입이 완료되었습니다.",
    })
  } catch (error) {
    console.error("Onboarding error:", error)
    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
