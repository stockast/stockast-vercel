import { NextResponse } from "next/server"
import { signIn } from "@/lib/auth/auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: "userId가 필요합니다." },
        { status: 400 }
      )
    }

    await signIn("credentials", {
      userId,
      redirect: false,
    })

    return NextResponse.json({
      success: true,
      message: "로그인되었습니다.",
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "로그인 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
