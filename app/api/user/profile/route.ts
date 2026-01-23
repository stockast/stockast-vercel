import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserId } from "@/lib/auth/session"
import { z } from "zod"

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(5).max(30).nullable().optional(),
  nickname: z.string().min(1).max(50).nullable().optional(),
  avatarUrl: z
    .string()
    .max(2_000_000)
    .refine(
      (value) => value.startsWith("data:image/") || /^https?:\/\//.test(value),
      "유효한 이미지 URL 또는 이미지 데이터가 필요합니다."
    )
    .nullable()
    .optional(),
  newsletterEnabled: z.boolean().optional(),
  newsletterTime: z.union([timeSchema, z.null()]).optional(),
})

async function resolveUserId(request: Request) {
  let userId = await getUserId()

  if (!userId) {
    const { searchParams } = new URL(request.url)
    const queryUserId = searchParams.get("userId")
    userId = queryUserId || null
  }

  return userId
}

async function getProfile(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      preferences: true,
      favoriteStocks: {
        include: { stock: { select: { ticker: true, nameEn: true } } },
        orderBy: { rank: "asc" },
      },
    },
  })

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    preferences: user.preferences
      ? {
          language: user.preferences.language,
          briefingStyle: user.preferences.briefingStyle,
          infoPreference: user.preferences.infoPreference,
          newsletterEnabled: user.preferences.newsletterEnabled,
          newsletterTime: user.preferences.newsletterTime,
        }
      : null,
    favoriteStocks: user.favoriteStocks.map((fs) => ({
      ticker: fs.stock.ticker,
      name: fs.stock.nameEn,
      rank: fs.rank,
    })),
  }
}

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: "userId가 필요합니다." },
        { status: 400 }
      )
    }

    const profile = await getProfile(userId)
    if (!profile) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json(
      { error: "프로필 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await resolveUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: "userId가 필요합니다." },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = profileSchema.parse(body)

    const userUpdate: Record<string, unknown> = {}
    if (validatedData.name !== undefined) userUpdate.name = validatedData.name
    if (validatedData.email !== undefined) userUpdate.email = validatedData.email
    if (validatedData.phone !== undefined) userUpdate.phone = validatedData.phone
    if (validatedData.nickname !== undefined) userUpdate.nickname = validatedData.nickname
    if (validatedData.avatarUrl !== undefined) userUpdate.avatarUrl = validatedData.avatarUrl

    if (Object.keys(userUpdate).length > 0) {
      await db.user.update({
        where: { id: userId },
        data: userUpdate,
      })
    }

    const prefUpdate: Record<string, unknown> = {}
    if (validatedData.newsletterEnabled !== undefined) {
      prefUpdate.newsletterEnabled = validatedData.newsletterEnabled
    }
    if (validatedData.newsletterTime !== undefined) {
      prefUpdate.newsletterTime = validatedData.newsletterTime
    }

    if (Object.keys(prefUpdate).length > 0) {
      await db.userPreference.upsert({
        where: { userId },
        update: prefUpdate,
        create: {
          userId,
          language: "ko",
          briefingStyle: "concise",
          infoPreference: "all",
          ...prefUpdate,
        },
      })
    }

    const profile = await getProfile(userId)
    return NextResponse.json({ success: true, profile })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "잘못된 입력 데이터입니다.", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Profile update error:", error)
    return NextResponse.json(
      { error: "프로필 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
