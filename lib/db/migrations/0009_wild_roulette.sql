ALTER TABLE "Chat" ADD COLUMN "updatedAt" timestamp;
UPDATE "Chat" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Chat" ALTER COLUMN "updatedAt" SET NOT NULL;