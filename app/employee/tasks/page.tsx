"use client";

import { TaskTable } from "@/components/task-workspace";

export default function EmployeeTasksPage() {
  return <TaskTable basePath="/employee/tasks" canAssign={false} />;
}
