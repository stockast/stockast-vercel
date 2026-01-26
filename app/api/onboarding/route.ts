import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { scheduleDailyBriefing } from "@/lib/queue"

const STOCKAST_USER_ID_COOKIE = "stockast_uid"

function getKstDateString(now: Date) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
    }

    const { name, email, phone, favorites, preferences } = body as {
      name?: unknown
      email?: unknown
      phone?: unknown
      favorites?: unknown
      preferences?: { style?: unknown; focus?: unknown } | undefined
    }

    if (typeof name !== "string" || typeof email !== "string" || !name || !email) {
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

    if (!Array.isArray(favorites) || favorites.length === 0) {
      return NextResponse.json(
        { error: "최소 1개 이상의 관심 종목을 선택해주세요." },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다." },
        { status: 409 }
      )
    }

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          phone: typeof phone === "string" && phone.length > 0 ? phone : null,
        },
      })

       await tx.userPreference.create({
         data: {
           userId: newUser.id,
           language: "ko",
           briefingStyle: preferences?.style === "detailed" ? "detailed" : "concise",
           infoPreference:
             preferences?.focus === "price" || preferences?.focus === "news" ? String(preferences.focus) : "all",
         },
       })

       for (let i = 0; i < favorites.length; i++) {
         const fav = favorites[i] as { ticker?: unknown; name?: unknown }
         if (typeof fav?.ticker !== "string" || fav.ticker.length === 0) {
           throw new Error("Invalid favorite ticker")
         }
         if (typeof fav?.name !== "string" || fav.name.length === 0) {
           throw new Error("Invalid favorite name")
         }
        
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

    const userCount = await db.user.count()
    if (userCount === 1) {
      const dateStr = getKstDateString(new Date())
      scheduleDailyBriefing(dateStr).catch((error) => {
        console.error("Immediate briefing enqueue error:", error)
      })
    }

    const response = NextResponse.json({
      success: true,
      userId: user.id,
      message: "회원가입이 완료되었습니다.",
    })

    response.cookies.set(STOCKAST_USER_ID_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })

    return response
  } catch (error) {
    console.error("Onboarding error:", error)
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : JSON.stringify(error)

    return NextResponse.json(
      {
        error: "회원가입 중 오류가 발생했습니다.",
        detail,
      },
      { status: 500 }
    )
  }
}
