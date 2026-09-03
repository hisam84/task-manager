-- Speeds GET /api/tasks filtered by company + priority
CREATE INDEX IF NOT EXISTS "Task_companyId_priority_idx" ON "Task"("companyId", "priority");

-- Speeds task list ordered by createdAt within a tenant
CREATE INDEX IF NOT EXISTS "Task_companyId_createdAt_idx" ON "Task"("companyId", "createdAt");

-- Speeds comment threads loaded with a task
CREATE INDEX IF NOT EXISTS "Comment_taskId_createdAt_idx" ON "Comment"("taskId", "createdAt");
CREATE INDEX IF NOT EXISTS "Comment_authorId_idx" ON "Comment"("authorId");
