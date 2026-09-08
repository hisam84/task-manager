"use client";

import React from "react";
import { Printer, X, Download } from "lucide-react";
import { formatTime12Hour, formatMinutes } from "@/lib/attendance";

interface AttendancePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  enableLatePenalty?: boolean;
  isManagerOrAdmin?: boolean;
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
      leaveCount?: number;
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
      isLeave?: boolean;
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

export function AttendancePrintModal({ isOpen, onClose, data, enableLatePenalty, isManagerOrAdmin = true }: AttendancePrintModalProps) {
  if (!isOpen || !data) return null;

  const showPenalty = isManagerOrAdmin && (enableLatePenalty ?? data?.enableLatePenalty ?? false);
  const showOvertime = isManagerOrAdmin;
  const { employee, year, month, summary, records } = data;
  const monthName = MONTH_NAMES[month - 1] || `Month ${month}`;
  const companyName = employee?.company?.name || "Company Workplace";
  const shiftName = employee?.shift?.name || "Standard Shift";
  const shiftTimes = `${employee?.shift?.startTime || "09:00"} - ${employee?.shift?.endTime || "18:00"}`;

  const handlePrint = () => {
    const printContent = document.getElementById("attendance-printable-area");
    if (!printContent) {
      window.print();
      return;
    }

    // Remove any previously created print iframe
    const existing = document.getElementById("attendance-print-iframe");
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "attendance-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.zIndex = "-9999";
    document.body.appendChild(iframe);

    const pri = iframe.contentWindow;
    if (!pri) {
      window.print();
      return;
    }

    // Collect all head stylesheets and inline styles (Tailwind, theme, etc.)
    const headStyles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((el) => el.outerHTML)
      .join("\n");

    pri.document.open();
    pri.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${companyName} - Attendance Report (${monthName} ${year})</title>
          ${headStyles}
          <style>
            @page {
              size: A4 portrait;
              margin: 4mm 6mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
              font-size: 9px !important;
              line-height: 1.25 !important;
              overflow: visible !important;
              height: auto !important;
            }
            #attendance-printable-area {
              display: block !important;
              visibility: visible !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
          </style>
        </head>
        <body>
          <div id="attendance-printable-area">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    pri.document.close();

    setTimeout(() => {
      try {
        pri.focus();
        pri.print();
      } catch (err) {
        console.error("Print error:", err);
        window.print();
      } finally {
        setTimeout(() => {
          iframe.remove();
        }, 2000);
      }
    }, 250);
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: 4mm 6mm;
            }
            @media print {
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                height: auto !important;
                min-height: auto !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              header, aside, nav, .print-hidden {
                display: none !important;
              }
              .fixed.inset-0 {
                position: static !important;
                background: transparent !important;
                padding: 0 !important;
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
              }
              #attendance-printable-area {
                display: block !important;
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                overflow: visible !important;
                max-height: none !important;
                page-break-inside: avoid !important;
              }
            }
          `,
        }}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static">
        <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black">
          {/* Modal Toolbar - Hidden during print */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 print:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-xs">
                <Printer className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                {showPenalty ? "Printable Attendance & Late Penalty Report" : "Printable Attendance Report"}
              </span>
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                1-Page A4 Optimized
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print / Save as PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Document Container */}
          <div
            id="attendance-printable-area"
            className="p-4 sm:p-6 max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 bg-white text-slate-900 font-sans leading-normal"
          >
            {/* Company & Report Header */}
            <div className="border-b border-slate-200 pb-3 mb-3 print:pb-2 print:mb-2">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                <div>
                  <h1 className="text-xl sm:text-2xl print:text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
                    {companyName}
                  </h1>
                  <h2 className="text-xs sm:text-sm print:text-[11px] font-bold text-indigo-700 mt-1 uppercase tracking-wide">
                    {showPenalty ? "EMPLOYEE ATTENDANCE & LATE PENALTY REPORT" : "EMPLOYEE ATTENDANCE REPORT"}
                  </h2>
                  <p className="text-xs print:text-[10px] text-slate-600 mt-1">
                    Report Period: <strong className="font-bold text-slate-900">{monthName} {year}</strong>
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs print:text-[9.5px] text-slate-500 leading-normal">
                  <p>Generated: <span className="font-medium text-slate-700">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span></p>
                  <p className="font-mono mt-0.5 font-semibold text-slate-700">Ref: ATT-{year}{String(month).padStart(2, "0")}-{employee?.id?.slice(-5) || "0000"}</p>
                </div>
              </div>

              {/* Employee Metadata Card */}
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs print:mt-1.5 print:p-2 print:bg-slate-50 print:border-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px] print:text-[8px] uppercase tracking-wider font-semibold">
                    Employee Name
                  </span>
                  <span className="font-bold text-slate-900 text-sm print:text-xs block mt-0.5 leading-snug">
                    {employee?.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] print:text-[8px] uppercase tracking-wider font-semibold">
                    Designation
                  </span>
                  <span className="font-semibold text-slate-800 block mt-0.5 leading-snug">
                    {employee?.designation || "Team Member"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] print:text-[8px] uppercase tracking-wider font-semibold">
                    Department
                  </span>
                  <span className="font-semibold text-slate-800 block mt-0.5 leading-snug">
                    {employee?.departmentRel?.name || employee?.department || "General"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] print:text-[8px] uppercase tracking-wider font-semibold">
                    Assigned Shift
                  </span>
                  <span className="font-semibold text-slate-800 block mt-0.5 leading-snug">
                    {shiftName} ({shiftTimes})
                  </span>
                </div>
              </div>
            </div>

            {/* KPI Summary Strip */}
            <div
              className={`grid gap-1.5 mb-2 print:mb-1.5 text-center ${
                showPenalty && showOvertime
                  ? "grid-cols-3 sm:grid-cols-6"
                  : showPenalty || showOvertime
                  ? "grid-cols-2 sm:grid-cols-5"
                  : "grid-cols-2 sm:grid-cols-4"
              }`}
            >
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
              {showOvertime && (
                <div className="p-1.5 print:p-1 rounded border border-indigo-200 bg-indigo-50/50">
                  <span className="block text-[9px] print:text-[8px] uppercase font-bold text-indigo-700">Overtime</span>
                  <span className="text-sm print:text-xs font-bold text-indigo-800">{formatMinutes(summary.totalOvertimeMinutes)}</span>
                </div>
              )}
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
                    {showOvertime && (
                      <th className="py-1 px-2 print:py-0.5 print:px-1.5 text-center">Overtime</th>
                    )}
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
                                : r.status === "LEAVE"
                                ? "bg-blue-100 text-blue-800"
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
                        {showOvertime && (
                          <td className="py-0.5 px-2 print:py-[1.5px] print:px-1.5 text-center font-mono">
                            {r.overtimeMinutes > 0 ? (
                              <span className="text-indigo-700 font-semibold">
                                +{formatMinutes(r.overtimeMinutes)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                        )}
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
                    {showOvertime && (
                      <td className="py-1 px-2 print:py-0.5 print:px-1.5 text-center text-indigo-800">
                        +{formatMinutes(summary.totalOvertimeMinutes)}
                      </td>
                    )}
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
