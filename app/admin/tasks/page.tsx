"use client";

import { TaskTable } from "@/components/task-workspace";

export default function AdminTasksPage() {
  return <TaskTable basePath="/admin/tasks" canAssign />;
}
