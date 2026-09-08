"use client";

import React from "react";
import { Printer, X, Download } from "lucide-react";
import { formatTime12Hour, formatMinutes } from "@/lib/attendance";

interface AttendancePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  enableLatePenalty?: boolean;
  data: {
    employee: any;
    year: number;
    month: number;
    enableLatePenalty?: boolean;
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

export function AttendancePrintModal({ isOpen, onClose, data, enableLatePenalty }: AttendancePrintModalProps) {
  if (!isOpen || !data) return null;

  const showPenalty = enableLatePenalty ?? data?.enableLatePenalty ?? false;
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
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: 5mm 6mm;
            }
            @media print {
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                overflow: visible !important;
              }
              body * {
                visibility: hidden !important;
              }
              #attendance-printable-area,
              #attendance-printable-area * {
                visibility: visible !important;
              }
              #attendance-printable-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                overflow: visible !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
              }
            }
          `,
        }}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static">
        <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black">
          {/* Modal Toolbar - Hidden during print */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-950/80 print:hidden">
            <div className="flex items-center gap-2.5">
              <Printer className="w-5 h-5 text-indigo-400" />
              <span className="font-semibold text-sm text-white">
                {showPenalty ? "Printable Attendance & Late Penalty Report" : "Printable Attendance Report"}
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                1-Page A4 Optimized
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print / Save as PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Document Container */}
          <div
            id="attendance-printable-area"
            className="p-4 sm:p-6 max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 bg-white text-slate-900 font-sans leading-tight"
          >
            {/* Company & Report Header */}
            <div className="border-b border-slate-900 pb-2 mb-2 print:pb-1.5 print:mb-1.5">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl sm:text-2xl print:text-lg font-bold tracking-tight text-slate-900 leading-none">
                    {companyName}
                  </h1>
                  <h2 className="text-xs sm:text-sm print:text-[11px] font-bold text-indigo-900 mt-1">
                    {showPenalty ? "EMPLOYEE ATTENDANCE & LATE PENALTY REPORT" : "EMPLOYEE ATTENDANCE REPORT"}
                  </h2>
                  <p className="text-[11px] print:text-[9.5px] text-slate-600 mt-0.5">
                    Report Period: <span className="font-bold text-slate-900">{monthName} {year}</span>
                  </p>
                </div>
                <div className="text-right text-[11px] print:text-[9px] text-slate-500 leading-snug">
                  <p>Generated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                  <p className="font-mono mt-0.5 font-semibold text-slate-700">Ref: ATT-{year}{String(month).padStart(2, "0")}-{employee?.id?.slice(-5) || "0000"}</p>
                </div>
              </div>

              {/* Employee Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-1.5 border-t border-slate-200 text-xs print:text-[9.5px] print:mt-1 print:pt-1">
                <div>
                  <span className="text-slate-500 block text-[9px] print:text-[8px] uppercase tracking-wider font-semibold">
                    Employee Name
                  </span>
                  <span className="font-bold text-slate-900">{employee?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] print:text-[8px] uppercase tracking-wider font-semibold">
                    Designation
                  </span>
                  <span className="font-medium text-slate-800">{employee?.designation || "Team Member"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] print:text-[8px] uppercase tracking-wider font-semibold">
                    Department
                  </span>
                  <span className="font-medium text-slate-800">
                    {employee?.departmentRel?.name || employee?.department || "General"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] print:text-[8px] uppercase tracking-wider font-semibold">
                    Assigned Shift
                  </span>
                  <span className="font-medium text-slate-800">
                    {shiftName} ({shiftTimes})
                  </span>
                </div>
              </div>
            </div>

            {/* KPI Summary Strip */}
            <div className={`grid gap-1.5 mb-2 print:mb-1.5 text-center ${showPenalty ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-5"}`}>
              <div className="p-1.5 print:p-1 rounded border border-slate-200 bg-slate-50">
                <span className="block text-[9px] print:text-[8px] uppercase font-bold text-slate-500">Total Days</span>
                <span className="text-sm print:text-xs font-bold text-slate-900">{summary.totalDays}</span>
              </div>
              <div className="p-1.5 print:p-1 rounded border border-slate-200 bg-slate-50">
                <span className="block text-[9px] print:text-[8px] uppercase font-bold text-slate-500">Present</span>
                <span className="text-sm print:text-xs font-bold text-emerald-700">{summary.presentCount}</span>
              </div>
              <div className="p-1.5 print:p-1 rounded border border-rose-200 bg-rose-50/50">
                <span className="block text-[9px] print:text-[8px] uppercase font-bold text-rose-600">Late Days</span>
                <span className="text-sm print:text-xs font-bold text-rose-700">{summary.lateCount}</span>
              </div>
              <div className="p-1.5 print:p-1 rounded border border-rose-200 bg-rose-50/50">
                <span className="block text-[9px] print:text-[8px] uppercase font-bold text-rose-600">Late Time</span>
                <span className="text-sm print:text-xs font-bold text-rose-700">{summary.totalLateMinutes}m</span>
              </div>
              {showPenalty && (
                <div className="p-1.5 print:p-1 rounded border border-rose-400 bg-rose-50">
                  <span className="block text-[9px] print:text-[8px] uppercase font-bold text-rose-800">Penalty Total</span>
                  <span className="text-sm print:text-xs font-bold text-rose-700">৳ {summary.totalLatePenalty}</span>
                </div>
              )}
              <div className="p-1.5 print:p-1 rounded border border-indigo-200 bg-indigo-50/50">
                <span className="block text-[9px] print:text-[8px] uppercase font-bold text-indigo-700">Overtime</span>
                <span className="text-sm print:text-xs font-bold text-indigo-800">{formatMinutes(summary.totalOvertimeMinutes)}</span>
              </div>
            </div>

            {/* Attendance & Penalty Table */}
            <div className="overflow-hidden border border-slate-300 rounded mb-2 print:mb-1.5">
              <table className="w-full text-left border-collapse text-xs print:text-[9px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-[10px] print:text-[8.5px]">
                    <th className="py-1 px-2 print:py-0.5 print:px-1.5 border-r border-slate-300">Date & Day</th>
                    <th className="py-1 px-2 print:py-0.5 print:px-1.5 border-r border-slate-300 text-center">Status</th>
                    <th className="py-1 px-2 print:py-0.5 print:px-1.5 border-r border-slate-300 text-center">In Time</th>
                    <th className="py-1 px-2 print:py-0.5 print:px-1.5 border-r border-slate-300 text-center">Out Time</th>
                    <th className="py-1 px-2 print:py-0.5 print:px-1.5 border-r border-slate-300 text-center">Work Hrs</th>
                    <th className="py-1 px-2 print:py-0.5 print:px-1.5 border-r border-slate-300 text-center">Late (min)</th>
                    {showPenalty && (
                      <th className="py-1 px-2 print:py-0.5 print:px-1.5 border-r border-slate-300 text-center">Penalty (৳)</th>
                    )}
                    <th className="py-1 px-2 print:py-0.5 print:px-1.5 text-center">Overtime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {records.map((r) => {
                    const dayName = dayNames[r.dayOfWeek];
                    const isLate = r.status === "LATE" || r.lateMinutes > 15;
                    const hasFine = showPenalty && r.latePenalty > 0;

                    return (
                      <tr
                        key={r.date}
                        className={`hover:bg-slate-50 leading-tight ${
                          hasFine ? "bg-rose-50/40" : r.isWeekend || r.isHoliday ? "bg-slate-50/60" : ""
                        }`}
                      >
                        <td className="py-0.5 px-2 print:py-[1.5px] print:px-1.5 border-r border-slate-200 font-medium whitespace-nowrap">
                          {String(r.day).padStart(2, "0")} {monthName.slice(0, 3)}, {dayName}
                          {r.holidayName && (
                            <span className="text-[9px] print:text-[7.5px] text-amber-700 font-normal ml-1">
                              ({r.holidayName})
                            </span>
                          )}
                        </td>
                        <td className="py-0.5 px-2 print:py-[1.5px] print:px-1.5 border-r border-slate-200 text-center">
                          <span
                            className={`inline-block px-1 py-0 rounded text-[9px] print:text-[8px] font-semibold ${
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
                        <td className="py-0.5 px-2 print:py-[1.5px] print:px-1.5 border-r border-slate-200 text-center font-mono">
                          {formatTime12Hour(r.inTime)}
                        </td>
                        <td className="py-0.5 px-2 print:py-[1.5px] print:px-1.5 border-r border-slate-200 text-center font-mono">
                          {formatTime12Hour(r.outTime)}
                        </td>
                        <td className="py-0.5 px-2 print:py-[1.5px] print:px-1.5 border-r border-slate-200 text-center font-mono">
                          {r.workingMinutes > 0 ? formatMinutes(r.workingMinutes) : "-"}
                        </td>
                        <td className="py-0.5 px-2 print:py-[1.5px] print:px-1.5 border-r border-slate-200 text-center font-semibold">
                          {r.lateMinutes > 0 ? (
                            <span className={isLate ? "text-rose-700 font-bold" : "text-slate-500"}>
                              {r.lateMinutes}m
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        {showPenalty && (
                          <td className="py-0.5 px-2 print:py-[1.5px] print:px-1.5 border-r border-slate-200 text-center font-bold">
                            {r.latePenalty > 0 ? (
                              <span className="text-rose-700">৳ {r.latePenalty}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>
                        )}
                        <td className="py-0.5 px-2 print:py-[1.5px] print:px-1.5 text-center font-mono">
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
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs print:text-[9px]">
                    <td colSpan={5} className="py-1 px-2 print:py-0.5 print:px-1.5 text-right border-r border-slate-300">
                      Monthly Total:
                    </td>
                    <td className="py-1 px-2 print:py-0.5 print:px-1.5 text-center border-r border-slate-300 text-rose-800">
                      {summary.totalLateMinutes}m
                    </td>
                    {showPenalty && (
                      <td className="py-1 px-2 print:py-0.5 print:px-1.5 text-center border-r border-slate-300 text-rose-800 font-bold">
                        ৳ {summary.totalLatePenalty}
                      </td>
                    )}
                    <td className="py-1 px-2 print:py-0.5 print:px-1.5 text-center text-indigo-800">
                      +{formatMinutes(summary.totalOvertimeMinutes)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Late Penalty Rule Explanation Note */}
            {showPenalty && (
              <div className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-[9px] print:text-[8px] text-slate-600 mb-2 print:mb-1.5">
                <span className="font-semibold text-slate-800">
                  Penalty Policy:{" "}
                </span>
                <span>
                  1-15m: Grace (৳0) • 16-20m: Flat ৳20 • 21-30m: Flat ৳30 • 31m+: ৳30 + (t × 2) where t is minutes beyond 30 min.
                </span>
              </div>
            )}

            {/* Signatures Block */}
            <div className="grid grid-cols-3 gap-6 pt-2 border-t border-slate-300 text-center text-xs print:text-[9px] text-slate-700 print:pt-1">
              <div>
                <div className="border-b border-slate-400 w-28 mx-auto mb-1 h-5 print:h-4"></div>
                <span className="font-semibold text-slate-800 block text-[10px] print:text-[8.5px]">Employee Signature</span>
                <span className="text-[9px] print:text-[7.5px] text-slate-400">Date: ____________</span>
              </div>
              <div>
                <div className="border-b border-slate-400 w-28 mx-auto mb-1 h-5 print:h-4"></div>
                <span className="font-semibold text-slate-800 block text-[10px] print:text-[8.5px]">Department Head</span>
                <span className="text-[9px] print:text-[7.5px] text-slate-400">Date: ____________</span>
              </div>
              <div>
                <div className="border-b border-slate-400 w-28 mx-auto mb-1 h-5 print:h-4"></div>
                <span className="font-semibold text-slate-800 block text-[10px] print:text-[8.5px]">HR & Accounts Authority</span>
                <span className="text-[9px] print:text-[7.5px] text-slate-400">Date: ____________</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
