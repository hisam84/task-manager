"use client";

import React from "react";
import { Printer, X, Download } from "lucide-react";
import { formatTime12Hour, formatMinutes } from "@/lib/attendance";

interface AttendancePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    employee: any;
    year: number;
    month: number;
    summary: {
      totalDays: number;
      presentCount: number;
      lateCount: number;
      absentCount: number;
      holidayCount: number;
      weekendCount: number;
      totalLateMinutes: number;
      totalLatePenalty: number;
      totalOvertimeMinutes: number;
      totalWorkingMinutes: number;
    };
    records: Array<{
      date: string;
      day: number;
      dayOfWeek: number;
      isWeekend: boolean;
      isHoliday: boolean;
      holidayName: string | null;
      status: string;
      inTime: string | null;
      outTime: string | null;
      lateMinutes: number;
      latePenalty: number;
      overtimeMinutes: number;
      workingMinutes: number;
      notes: string | null;
    }>;
  } | null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function AttendancePrintModal({ isOpen, onClose, data }: AttendancePrintModalProps) {
  if (!isOpen || !data) return null;

  const { employee, year, month, summary, records } = data;
  const monthName = MONTH_NAMES[month - 1] || `Month ${month}`;
  const companyName = employee?.company?.name || "Company Workplace";
  const shiftName = employee?.shift?.name || "Standard Shift";
  const shiftTimes = `${employee?.shift?.startTime || "09:00"} - ${employee?.shift?.endTime || "18:00"}`;

  const handlePrint = () => {
    window.print();
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Modal Toolbar - Hidden during print */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-sm text-white">
              Printable Attendance & Late Penalty Report
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-6 sm:p-8 max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 bg-white text-slate-900 font-sans">
          {/* Company & Report Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{companyName}</h1>
                <h2 className="text-base font-semibold text-indigo-900 mt-0.5">
                  EMPLOYEE ATTENDANCE & LATE PENALTY REPORT
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Report Period: <span className="font-bold text-slate-800">{monthName} {year}</span>
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Generated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                <p className="font-mono mt-0.5">Ref: ATT-{year}{String(month).padStart(2, "0")}-{employee?.id?.slice(-5) || "0000"}</p>
              </div>
            </div>

            {/* Employee Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">
                  Employee Name
                </span>
                <span className="font-bold text-slate-900">{employee?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">
                  Designation
                </span>
                <span className="font-medium text-slate-800">{employee?.designation || "Team Member"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">
                  Department
                </span>
                <span className="font-medium text-slate-800">
                  {employee?.departmentRel?.name || employee?.department || "General"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">
                  Assigned Shift
                </span>
                <span className="font-medium text-slate-800">
                  {shiftName} ({shiftTimes})
                </span>
              </div>
            </div>
          </div>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6 text-center">
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Total Days</span>
              <span className="text-lg font-bold text-slate-900">{summary.totalDays}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Present</span>
              <span className="text-lg font-bold text-emerald-700">{summary.presentCount}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/50">
              <span className="block text-[10px] uppercase font-bold text-rose-600">Late Days</span>
              <span className="text-lg font-bold text-rose-700">{summary.lateCount}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/50">
              <span className="block text-[10px] uppercase font-bold text-rose-600">Late Time</span>
              <span className="text-lg font-bold text-rose-700">{summary.totalLateMinutes}m</span>
            </div>
            <div className="p-2.5 rounded-lg border-2 border-rose-400 bg-rose-50">
              <span className="block text-[10px] uppercase font-bold text-rose-800">Penalty Total</span>
              <span className="text-lg font-bold text-rose-700">৳ {summary.totalLatePenalty}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/50">
              <span className="block text-[10px] uppercase font-bold text-indigo-700">Overtime</span>
              <span className="text-lg font-bold text-indigo-800">{formatMinutes(summary.totalOvertimeMinutes)}</span>
            </div>
          </div>

          {/* Attendance & Penalty Table */}
          <div className="overflow-hidden border border-slate-300 rounded-lg mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold text-[11px]">
                  <th className="py-2 px-2.5 border-r border-slate-300">Date & Day</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 text-center">Status</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 text-center">In Time</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 text-center">Out Time</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 text-center">Work Hrs</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 text-center">Late (min)</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 text-center">Penalty (৳)</th>
                  <th className="py-2 px-2.5 text-center">Overtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((r) => {
                  const dayName = dayNames[r.dayOfWeek];
                  const isLate = r.status === "LATE" || r.lateMinutes > 15;
                  const hasFine = r.latePenalty > 0;

                  return (
                    <tr
                      key={r.date}
                      className={`hover:bg-slate-50 ${
                        hasFine ? "bg-rose-50/40" : r.isWeekend || r.isHoliday ? "bg-slate-50/60" : ""
                      }`}
                    >
                      <td className="py-1.5 px-2.5 border-r border-slate-200 font-medium">
                        {String(r.day).padStart(2, "0")} {monthName.slice(0, 3)}, {dayName}
                        {r.holidayName && (
                          <span className="block text-[10px] text-amber-700 font-normal">
                            ({r.holidayName})
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            r.status === "PRESENT"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "LATE"
                              ? "bg-rose-100 text-rose-800"
                              : r.status === "HOLIDAY"
                              ? "bg-amber-100 text-amber-800"
                              : r.status === "WEEKEND"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-mono">
                        {formatTime12Hour(r.inTime)}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-mono">
                        {formatTime12Hour(r.outTime)}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-mono">
                        {r.workingMinutes > 0 ? formatMinutes(r.workingMinutes) : "-"}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-semibold">
                        {r.lateMinutes > 0 ? (
                          <span className={isLate ? "text-rose-700 font-bold" : "text-slate-500"}>
                            {r.lateMinutes}m
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-bold">
                        {r.latePenalty > 0 ? (
                          <span className="text-rose-700">৳ {r.latePenalty}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-mono">
                        {r.overtimeMinutes > 0 ? (
                          <span className="text-indigo-700 font-semibold">
                            +{formatMinutes(r.overtimeMinutes)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
                  <td colSpan={5} className="py-2 px-2.5 text-right border-r border-slate-300">
                    Monthly Total:
                  </td>
                  <td className="py-2 px-2.5 text-center border-r border-slate-300 text-rose-800">
                    {summary.totalLateMinutes}m
                  </td>
                  <td className="py-2 px-2.5 text-center border-r border-slate-300 text-rose-800 text-sm">
                    ৳ {summary.totalLatePenalty}
                  </td>
                  <td className="py-2 px-2.5 text-center text-indigo-800">
                    +{formatMinutes(summary.totalOvertimeMinutes)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Late Penalty Rule Explanation Note */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 mb-8">
            <span className="font-semibold text-slate-800 block mb-0.5">
              Penalty Policy Reference:
            </span>
            <span>
              1 to 15 min late: Grace period (৳ 0) • 16 to 20 min late: Flat ৳ 20 • 21 to 30 min late: Flat ৳ 30 • 31+ min late: ৳ 30 + (t × 2) where t is minutes beyond 30 min.
            </span>
          </div>

          {/* Signatures Block */}
          <div className="grid grid-cols-3 gap-8 pt-8 border-t border-slate-300 text-center text-xs text-slate-700">
            <div>
              <div className="border-b border-slate-400 w-3/4 mx-auto mb-2 h-8"></div>
              <span className="font-medium text-slate-800 block">Employee Signature</span>
              <span className="text-[10px] text-slate-400">Date: ____________</span>
            </div>
            <div>
              <div className="border-b border-slate-400 w-3/4 mx-auto mb-2 h-8"></div>
              <span className="font-medium text-slate-800 block">Department Head</span>
              <span className="text-[10px] text-slate-400">Date: ____________</span>
            </div>
            <div>
              <div className="border-b border-slate-400 w-3/4 mx-auto mb-2 h-8"></div>
              <span className="font-medium text-slate-800 block">HR & Accounts Authority</span>
              <span className="text-[10px] text-slate-400">Date: ____________</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
