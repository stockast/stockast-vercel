import { NextResponse } from "next/server"

const STOCKAST_USER_ID_COOKIE = "stockast_uid"

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "로그아웃되었습니다.",
    })

    response.cookies.set(STOCKAST_USER_ID_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { error: "로그아웃 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
