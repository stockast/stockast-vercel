import { NextResponse } from "next/server"
import { db } from "@/lib/db"

const STOCKAST_USER_ID_COOKIE = "stockast_uid"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const userId = body && typeof body === "object" ? (body as { userId?: unknown }).userId : undefined

    if (typeof userId !== "string" || userId.length === 0) {
      return NextResponse.json(
        { error: "userId가 필요합니다." },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
    }

    const response = NextResponse.json({
      success: true,
      message: "로그인되었습니다.",
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
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "로그인 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
