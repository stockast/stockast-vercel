# Stockast - US Stock Briefing Service

매일 아침 8시 30분 (KST), 미국 주식 브리핑을 받아보세요.

## Features

- **Personalized Briefings**: 관심 종목 기반 뉴스 및 주가 요약
- **Toss-style UI**: 깔끔하고 현대적인 인터페이스
- **Daily Updates**: 매일 오전 8시 30분 자동 업데이트
- **Popular Trends**: 다른 투자자들이 관심을 가진 종목 확인

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **Cache/Queue**: Redis (Upstash), BullMQ
- **Stock Data**: Finnhub API
- **LLM**: OpenAI GPT-4o-mini
- **Scheduling**: Vercel Cron (8:30 AM KST = 11:30 PM UTC)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env` file with:

```env
# Database (Supabase)
DATABASE_URL="postgresql://..."

# Redis (Upstash)
REDIS_URL="redis://..."

# Finnhub API
FINNHUB_API_KEY="your_key"

# OpenAI API
OPENAI_API_KEY="your_key"
OPENAI_MODEL="gpt-4o-mini"

# Scheduler
CRON_SECRET="your_secret"
```

### 3. Database Setup

```bash
npx prisma migrate dev
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel

1. Connect repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

### Cron Job Setup

The daily briefing is triggered at **8:30 AM KST (11:30 PM UTC)** via Vercel Cron Jobs.

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-briefing",
      "schedule": "30 23 * * 1-5"
    }
  ]
}
```

**Cron Schedule (UTC)**:
- `30 23 * * 1-5` = Every day at 23:30 (11:30 PM), Monday to Friday
- This is 8:30 AM KST the next day

## Project Structure

```
stockast/
├── app/
│   ├── (app)/briefing/     # Briefing page
│   ├── (public)/onboarding/ # User onboarding
│   └── api/                 # API routes
├── components/              # React components
├── lib/
│   ├── clients/            # API clients (Finnhub, OpenAI)
│   ├── jobs/               # Background job processors
│   ├── scrapers/           # News scrapers
│   └── ...                 # Utilities
└── prisma/
    └── schema.prisma       # Database schema
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/onboarding` | POST | User registration |
| `/api/stocks/search` | GET | Search stocks |
| `/api/briefings/today` | GET | Get today's briefing |
| `/api/popular-today` | GET | Get popular stocks |
| `/api/cron/daily-briefing` | GET | Trigger daily briefing (cron) |

## License

MIT
# stockast
# stockast
