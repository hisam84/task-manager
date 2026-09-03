"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { KanbanBoard } from "@/components/kanban-board";
import { CreateTaskModal } from "@/components/create-task-modal";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { CreateCompanyModal } from "@/components/create-company-modal";
import { Plus } from "lucide-react";
import { AuthLoginScreen } from "@/components/auth-login-screen";

export default function KanbanPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  useEffect(() => {
    fetchSessionAndTasks();
  }, []);

  async function fetchSessionAndTasks() {
    setLoading(true);
    try {
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();
      setCurrentUser(authData.user);

      const tasksRes = await fetch("/api/tasks");
      const tasksData = await tasksRes.json();
      if (Array.isArray(tasksData)) {
        setTasks(tasksData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(taskId: string, newStatus: any) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchSessionAndTasks();
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!loading && !currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Navbar user={null} />
        <AuthLoginScreen onSuccess={fetchSessionAndTasks} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar
        user={currentUser}
        onOpenCreateTask={() => setIsCreateTaskOpen(true)}
        onOpenCreateCompany={() => setIsCreateCompanyOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Interactive Kanban Board
            </h1>
            <p className="text-xs text-[#888888] mt-1 font-mono">
              Drag or click column selectors to update task progress in real time
            </p>
          </div>

          {["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(currentUser?.role) && (
            <button
              onClick={() => setIsCreateTaskOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#0070f3] hover:bg-[#0060df] text-xs font-medium text-white transition-all shadow-[0_0_20px_rgba(0,112,243,0.3)] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs font-mono text-[#888888] animate-pulse">
            Loading Kanban board...
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onTaskClick={(t) => setSelectedTask(t)}
            onStatusChange={handleStatusChange}
            onNewTaskClick={
              ["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(currentUser?.role)
                ? () => setIsCreateTaskOpen(true)
                : undefined
            }
          />
        )}
      </main>

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSuccess={fetchSessionAndTasks}
      />

      <CreateCompanyModal
        isOpen={isCreateCompanyOpen}
        onClose={() => setIsCreateCompanyOpen(false)}
        onSuccess={fetchSessionAndTasks}
      />

      <TaskDetailModal
        task={selectedTask}
        currentUser={currentUser}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={fetchSessionAndTasks}
      />
    </div>
  );
}
