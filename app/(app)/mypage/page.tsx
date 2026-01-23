'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useUserStore } from '@/lib/stores/userStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Settings } from 'lucide-react'
import { RouteLoader } from '@/components/RouteLoader'

export default function MyPage() {
  const { profile, isLoading, error, fetchProfile, updateProfile, updateAccount, updatePreferences } = useUserStore()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState({
    nickname: '',
    name: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    if (!profile) return
    setDraft({
      nickname: profile.nickname || '',
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
    })
  }, [profile])

  const handleNewsletterToggle = (enabled: boolean) => {
    updatePreferences({ newsletterEnabled: enabled })
  }

  const handleNewsletterTimeChange = (time: string) => {
    updatePreferences({ newsletterTime: time ? time : null })
  }

  const initials = useMemo(() => {
    if (!profile) return 'S'
    if (profile.nickname && profile.nickname.trim().length > 0) return profile.nickname.trim()[0]
    return profile.email[0]?.toUpperCase() || 'S'
  }, [profile])

  const onUploadClick = () => {
    fileInputRef.current?.click()
  }

  const onFileChange = async (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null
      if (!result) return
      updateProfile({ avatarUrl: result })
    }
    reader.readAsDataURL(file)
  }

  const saveEdits = async () => {
    await updateAccount({
      nickname: draft.nickname || null,
      name: draft.name || null,
      email: draft.email || profile?.email || '',
      phone: draft.phone ? draft.phone : null,
    })
    setEditOpen(false)
  }

  if (isLoading) return <RouteLoader />
  if (error) return <div>오류: {error}</div>
  if (!profile) return <div>프로필을 찾을 수 없습니다.</div>

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">마이페이지</h1>

      <Card>
        <CardHeader>
          <CardTitle>프로필 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="프로필 사진 변경" className="rounded-full">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => updateProfile({ avatarUrl: null })}
                >
                  프로필 사진 삭제
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onUploadClick}>프로필 사진 업로드</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{profile.nickname || '닉네임을 설정해주세요'}</p>
                <Sheet open={editOpen} onOpenChange={setEditOpen}>
                  <SheetTrigger asChild>
                    <button type="button" aria-label="설정" className="p-1 rounded-md hover:bg-gray-100">
                      <Settings className="h-4 w-4 text-gray-600" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-2xl">
                    <SheetHeader>
                      <SheetTitle>프로필 수정</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-4">
                      <div>
                        <Label htmlFor="edit-nickname">닉네임</Label>
                        <Input
                          id="edit-nickname"
                          value={draft.nickname}
                          onChange={(e) => setDraft((prev) => ({ ...prev, nickname: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-name">이름</Label>
                        <Input
                          id="edit-name"
                          value={draft.name}
                          onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-email">이메일</Label>
                        <Input
                          id="edit-email"
                          value={draft.email}
                          onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-phone">전화번호</Label>
                        <Input
                          id="edit-phone"
                          value={draft.phone}
                          onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={saveEdits}
                        className="w-full h-11 rounded-xl bg-black text-white font-semibold"
                      >
                        저장
                      </button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              <p className="text-sm text-gray-500 truncate">{profile.email}</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>뉴스레터 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="newsletter"
              checked={profile.preferences?.newsletterEnabled || false}
              onCheckedChange={handleNewsletterToggle}
            />
            <Label htmlFor="newsletter">뉴스레터 받기</Label>
          </div>

          {profile.preferences?.newsletterEnabled && (
            <div>
              <Label htmlFor="time">받을 시간</Label>
              <Input
                id="time"
                type="time"
                value={profile.preferences.newsletterTime || ''}
                onChange={(e) => handleNewsletterTimeChange(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>관심 종목</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {profile.favoriteStocks.map((stock) => (
              <div key={stock.ticker} className="flex justify-between">
                <span>{stock.ticker} - {stock.name}</span>
                <span>순위: {stock.rank}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
