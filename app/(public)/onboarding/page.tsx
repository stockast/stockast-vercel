"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StockPicker } from "@/components/onboarding/StockPicker"
import { PreferenceSelector } from "@/components/onboarding/PreferenceSelector"
import { Loader2 } from "lucide-react"

interface OnboardingData {
  name: string
  email: string
  phone: string
  favorites: Array<{ ticker: string; name: string }>
  style: "concise" | "detailed"
  focus: "all" | "price" | "news"
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [data, setData] = useState<OnboardingData>({
    name: "",
    email: "",
    phone: "",
    favorites: [],
    style: "concise",
    focus: "all",
  })

  useEffect(() => {
    const userId = localStorage.getItem("stockast_user_id")
    if (userId) {
      router.replace("/home")
    }
  }, [router])

  const handleNext = () => {
    if (step === 1) {
      if (!data.name || !data.email) {
        setError("이름과 이메일을 입력해주세요.")
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        setError("올바른 이메일 형식을 입력해주세요.")
        return
      }
    }
    setError("")
    setStep(step + 1)
  }

  const handleBack = () => {
    setError("")
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (data.favorites.length === 0) {
      setError("최소 1개 이상의 관심 종목을 선택해주세요.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          favorites: data.favorites,
          preferences: {
            style: data.style,
            focus: data.focus,
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "회원가입에 실패했습니다.")
      }

      // Store user ID in localStorage for demo (in production, use proper auth)
      if (result.userId) {
        localStorage.setItem("stockast_user_id", result.userId)
      }

      router.push("/home")
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex items-center justify-center px-4 py-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Stockast에 오신 것을 환영합니다
          </CardTitle>
          <CardDescription>
            매일 아침 8시 30분, 미국 주식 브리핑을 받아보세요
          </CardDescription>
          
          {/* Progress indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full transition-colors ${
                  step >= s ? "bg-primary" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  placeholder="홍길동"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">전화번호 (선택)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  value={data.phone}
                  onChange={(e) => setData({ ...data, phone: e.target.value })}
                />
                <p className="text-xs text-gray-500">
                  알림 받기를 원하시면 입력해주세요
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-medium text-lg">관심 종목 선택</h3>
                <p className="text-sm text-gray-500">
                  최대 3개까지 선택 가능 (나중에 변경 가능)
                </p>
              </div>

              <StockPicker
                selected={data.favorites}
                onChange={(stocks) => setData({ ...data, favorites: stocks })}
                max={3}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <PreferenceSelector
                style={data.style}
                focus={data.focus}
                onStyleChange={(style) => setData({ ...data, style })}
                onFocusChange={(focus) => setData({ ...data, focus })}
              />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                이전
              </Button>
            )}
            
            {step < 3 ? (
              <Button onClick={handleNext} className="flex-1">
                다음
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || data.favorites.length === 0}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  "시작하기"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
