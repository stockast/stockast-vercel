"use client"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface PreferenceSelectorProps {
  style: "concise" | "detailed"
  focus: "all" | "price" | "news"
  onStyleChange: (style: "concise" | "detailed") => void
  onFocusChange: (focus: "all" | "price" | "news") => void
}

export function PreferenceSelector({
  style,
  focus,
  onStyleChange,
  onFocusChange,
}: PreferenceSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Briefing Style */}
      <div className="space-y-3">
        <Label className="text-base">브리핑 스타일</Label>
        <RadioGroup
          value={style}
          onValueChange={(v) => onStyleChange(v as "concise" | "detailed")}
          className="grid grid-cols-2 gap-3"
        >
          <Label
            htmlFor="style-concise"
            className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
              style === "concise"
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <RadioGroupItem value="concise" id="style-concise" className="sr-only" />
            <span className="font-medium">간결하게</span>
            <span className="text-xs text-gray-500 text-center mt-1">
              핵심만 빠르게 확인
            </span>
          </Label>

          <Label
            htmlFor="style-detailed"
            className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
              style === "detailed"
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <RadioGroupItem value="detailed" id="style-detailed" className="sr-only" />
            <span className="font-medium">상세하게</span>
            <span className="text-xs text-gray-500 text-center mt-1">
              깊이 있는 분석 확인
            </span>
          </Label>
        </RadioGroup>
      </div>

      {/* Info Focus */}
      <div className="space-y-3">
        <Label className="text-base">관심 정보</Label>
        <RadioGroup
          value={focus}
          onValueChange={(v) => onFocusChange(v as "all" | "price" | "news")}
          className="space-y-3"
        >
          <Label
            htmlFor="focus-all"
            className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
              focus === "all"
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <RadioGroupItem value="all" id="focus-all" />
            <div>
              <span className="font-medium">전체</span>
              <p className="text-sm text-gray-500">주가와 뉴스 모두 확인</p>
            </div>
          </Label>

          <Label
            htmlFor="focus-price"
            className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
              focus === "price"
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <RadioGroupItem value="price" id="focus-price" />
            <div>
              <span className="font-medium">주가 위주</span>
              <p className="text-sm text-gray-500">가격 변동과 지표 중심</p>
            </div>
          </Label>

          <Label
            htmlFor="focus-news"
            className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
              focus === "news"
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <RadioGroupItem value="news" id="focus-news" />
            <div>
              <span className="font-medium">뉴스 위주</span>
              <p className="text-sm text-gray-500">기업 뉴스와 소식 중심</p>
            </div>
          </Label>
        </RadioGroup>
      </div>
    </div>
  )
}
