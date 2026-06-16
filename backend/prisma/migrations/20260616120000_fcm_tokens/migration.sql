DROP TABLE IF EXISTS "PushSubscription";

CREATE TABLE "FcmToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "userAgent" TEXT,
    "userId" TEXT,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FcmToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FcmToken_token_key" ON "FcmToken"("token");
CREATE INDEX "FcmToken_userId_idx" ON "FcmToken"("userId");
CREATE INDEX "FcmToken_adminId_idx" ON "FcmToken"("adminId");

ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
