import { create } from 'zustand'

type Preferences = {
  language: string
  briefingStyle: string
  infoPreference: string
  newsletterEnabled: boolean
  newsletterTime: string | null
}

interface UserProfile {
  id: string
  email: string
  name: string | null
  phone: string | null
  nickname: string | null
  avatarUrl: string | null
  preferences: Preferences | null
  favoriteStocks: Array<{
    ticker: string
    name: string
    rank: number
  }>
}

interface UserStore {
  profile: UserProfile | null
  isLoading: boolean
  error: string | null
  fetchProfile: () => Promise<void>
  updateProfile: (updates: Partial<Pick<UserProfile, 'nickname' | 'avatarUrl'>>) => Promise<void>
  updateAccount: (updates: Partial<Pick<UserProfile, 'nickname' | 'name' | 'email' | 'phone'>>) => Promise<void>
  updatePreferences: (updates: Partial<Pick<Preferences, 'newsletterEnabled' | 'newsletterTime'>>) => Promise<void>
}

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null })
    try {
      const userId = localStorage.getItem('stockast_user_id')
      const url = userId ? `/api/user/profile?userId=${userId}` : '/api/user/profile'
      const response = await fetch(url)
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || '프로필을 불러오지 못했습니다.')
      }
      const profile = (await response.json()) as UserProfile
      set({ profile, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false })
    }
  },

  updateProfile: async (updates) => {
    const { profile } = get()
    if (!profile) return

    set({ profile: { ...profile, ...updates } })

    try {
      const userId = localStorage.getItem('stockast_user_id')
      const url = userId ? `/api/user/profile?userId=${userId}` : '/api/user/profile'
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || '프로필 업데이트에 실패했습니다.')
      }
      await get().fetchProfile()
    } catch (error) {
      set({ profile })
      set({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  },

  updateAccount: async (updates) => {
    const { profile } = get()
    if (!profile) return

    set({ profile: { ...profile, ...updates } })

    try {
      const userId = localStorage.getItem('stockast_user_id')
      const url = userId ? `/api/user/profile?userId=${userId}` : '/api/user/profile'
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || '계정 정보 업데이트에 실패했습니다.')
      }
      await get().fetchProfile()
    } catch (error) {
      set({ profile })
      set({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  },

  updatePreferences: async (updates) => {
    const { profile } = get()
    if (!profile || !profile.preferences) return

    set({
      profile: {
        ...profile,
        preferences: { ...profile.preferences, ...updates }
      }
    })

    try {
      const userId = localStorage.getItem('stockast_user_id')
      const url = userId ? `/api/user/profile?userId=${userId}` : '/api/user/profile'
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || '설정 업데이트에 실패했습니다.')
      }
      await get().fetchProfile()
    } catch (error) {
      set({ profile })
      set({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  },
}))
