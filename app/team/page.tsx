"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { InviteUserModal } from "@/components/invite-user-modal";
import { CreateTaskModal } from "@/components/create-task-modal";
import { CreateCompanyModal } from "@/components/create-company-modal";
import { UserPlus, Mail } from "lucide-react";
import { AuthLoginScreen } from "@/components/auth-login-screen";

export default function TeamPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();
      setCurrentUser(authData.user);

      const usersRes = await fetch("/api/users");
      const usersData = await usersRes.json();
      if (Array.isArray(usersData)) {
        setTeamMembers(usersData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const canInvite = ["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(currentUser?.role);

  if (!loading && !currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Navbar user={null} />
        <AuthLoginScreen onSuccess={fetchData} />
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

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Team Directory</h1>
            <p className="text-xs text-[#888888] font-mono mt-0.5">
              {currentUser?.companyName || "Platform Wide"} members
            </p>
          </div>

          {canInvite && (
            <button
              onClick={() => setIsInviteOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs font-mono text-[#888888]">Loading team...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map((member) => {
              const activeCount =
                member.assignedTasks?.filter((t: any) => t.status !== "DONE").length || 0;
              const completedCount =
                member.assignedTasks?.filter((t: any) => t.status === "DONE").length || 0;

              return (
                <div
                  key={member.id}
                  className="vercel-card rounded-xl p-4 flex flex-col justify-between hover:border-[#333333] transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#151515] border border-[#2e2e2e] flex items-center justify-center text-xs font-mono font-bold text-white">
                        {member.name?.[0]}
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-white">{member.name}</h3>
                        <span className="text-[11px] font-mono text-[#888888] flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-[#555555]" />
                          {member.email}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#111111] border border-[#222222] text-cyan-300">
                      {member.role}
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-[#1a1a1a] flex items-center justify-between text-xs font-mono">
                    <span className="text-[#777777]">{member.department || "General"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">{activeCount} active</span>
                      <span className="text-emerald-400">{completedCount} done</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <InviteUserModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={fetchData}
      />

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSuccess={fetchData}
      />

      <CreateCompanyModal
        isOpen={isCreateCompanyOpen}
        onClose={() => setIsCreateCompanyOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
