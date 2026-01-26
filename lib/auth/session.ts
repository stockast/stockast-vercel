import { getServerSession } from "next-auth"
import { cookies } from "next/headers"
import { authOptions } from "./auth"

const STOCKAST_USER_ID_COOKIE = "stockast_uid"

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function getUserId(): Promise<string | null> {
  const session = await getSession()
  if (session?.user?.id) return session.user.id

  const cookieStore = await cookies()
  const cookieUserId = cookieStore.get(STOCKAST_USER_ID_COOKIE)?.value
  return cookieUserId || null
}
