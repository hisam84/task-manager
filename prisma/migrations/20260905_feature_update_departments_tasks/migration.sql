-- Company contact fields
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Departments
CREATE TABLE IF NOT EXISTS "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Department_companyId_name_key" ON "Department"("companyId", "name");
CREATE INDEX IF NOT EXISTS "Department_companyId_isActive_idx" ON "Department"("companyId", "isActive");

DO $$ BEGIN
  ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Backfill departments from existing user.department strings
INSERT INTO "Department" ("id", "name", "companyId", "isActive", "createdAt", "updatedAt")
SELECT
  'dept_' || md5(u."companyId" || ':' || COALESCE(NULLIF(TRIM(u."department"), ''), 'General')),
  COALESCE(NULLIF(TRIM(u."department"), ''), 'General'),
  u."companyId",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE u."companyId" IS NOT NULL
GROUP BY u."companyId", COALESCE(NULLIF(TRIM(u."department"), ''), 'General')
ON CONFLICT ("companyId", "name") DO NOTHING;

-- User profile fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "employeeCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "designation" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "joiningDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

UPDATE "User" u
SET "departmentId" = d."id"
FROM "Department" d
WHERE u."companyId" = d."companyId"
  AND d."name" = COALESCE(NULLIF(TRIM(u."department"), ''), 'General')
  AND u."departmentId" IS NULL
  AND u."companyId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "User_companyId_role_idx" ON "User"("companyId", "role");
CREATE INDEX IF NOT EXISTS "User_departmentId_idx" ON "User"("departmentId");
CREATE INDEX IF NOT EXISTS "User_companyId_isActive_idx" ON "User"("companyId", "isActive");

DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Recreate company FK with cascade
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_companyId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" DROP COLUMN IF EXISTS "department";

-- Task fields
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "progress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "isSelfTask" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "adminComment" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "employeeComment" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

UPDATE "Task" SET "status" = 'PENDING' WHERE "status" = 'TODO';
UPDATE "Task" SET "status" = 'IN_PROGRESS' WHERE "status" = 'IN_REVIEW';
UPDATE "Task" SET "status" = 'COMPLETED', "progress" = 100, "completedAt" = COALESCE("completedAt", "updatedAt") WHERE "status" = 'DONE';
UPDATE "Task" SET "progress" = 50 WHERE "status" = 'IN_PROGRESS' AND "progress" = 0;
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'PENDING';

UPDATE "Task" t
SET "departmentId" = u."departmentId"
FROM "User" u
WHERE t."assigneeId" = u."id"
  AND t."departmentId" IS NULL
  AND u."departmentId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Task_companyId_dueDate_idx" ON "Task"("companyId", "dueDate");
CREATE INDEX IF NOT EXISTS "Task_departmentId_idx" ON "Task"("departmentId");
CREATE INDEX IF NOT EXISTS "Task_isSelfTask_idx" ON "Task"("isSelfTask");

DO $$ BEGIN
  ALTER TABLE "Task" ADD CONSTRAINT "Task_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_companyId_fkey";
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_assigneeId_fkey";
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_creatorId_fkey";
ALTER TABLE "Task" ADD CONSTRAINT "Task_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_authorId_fkey";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Task activity
CREATE TABLE IF NOT EXISTS "TaskActivity" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TaskActivity_taskId_createdAt_idx" ON "TaskActivity"("taskId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
