export interface TaskListResponse {
  tasks: unknown[];
  nextCursor: string | null;
}

export async function fetchTaskList(params?: Record<string, string | undefined>): Promise<TaskListResponse> {
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
  }
  const qs = search.toString();
  const res = await fetch(qs ? `/api/tasks?${qs}` : "/api/tasks");
  const data = await res.json();
  if (Array.isArray(data)) {
    return { tasks: data, nextCursor: null };
  }
  return {
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    nextCursor: data.nextCursor ?? null,
  };
}
