-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "newsletterEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "newsletterTime" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "nickname" TEXT;
