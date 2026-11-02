"use client";

import React, { useState } from "react";
import { Printer, X, Layout } from "lucide-react";
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
      isCompanyHoliday?: boolean;
      isHolidayOverridden?: boolean;
      isLeave?: boolean;
      holidayName: string | null;
      status: string;
      inTime: string | null;
      outTime: string | null;
      lateMinutes: number;
      latePenalty: number;
      lateReason?: string | null;
      lateInformed?: boolean;
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
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");

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
              size: A4 ${orientation};
              margin: ${orientation === "landscape" ? "8mm 10mm" : "6mm 8mm"};
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
              font-size: 16px !important;
              line-height: 1.4 !important;
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
              font-size: 16px !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              font-size: 16px !important;
            }
            thead {
              display: table-header-group !important;
            }
            tr {
              page-break-inside: avoid !important;
            }
            th, td {
              font-size: 16px !important;
              line-height: 1.35 !important;
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
              size: A4 ${orientation};
              margin: ${orientation === "landscape" ? "8mm 10mm" : "6mm 8mm"};
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
                font-size: 16px !important;
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
                font-size: 16px !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                font-size: 16px !important;
              }
              thead {
                display: table-header-group !important;
              }
              tr {
                page-break-inside: avoid !important;
              }
              th, td {
                font-size: 16px !important;
              }
            }
          `,
        }}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static">
        <div className="relative w-full max-w-5xl lg:max-w-6xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black">
          {/* Modal Toolbar - Hidden during print */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 print:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-xs">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight block">
                  {showPenalty ? "Printable Attendance & Late Penalty Report" : "Printable Attendance Report"}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Optimized 16px+ typography with content-adjusted columns
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Orientation Switcher */}
              <div className="inline-flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setOrientation("landscape")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    orientation === "landscape"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                  title="Landscape is recommended for wide table layout"
                >
                  <Layout className="w-3.5 h-3.5 rotate-90" />
                  Landscape
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("portrait")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    orientation === "portrait"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Layout className="w-3.5 h-3.5" />
                  Portrait
                </button>
              </div>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
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
            className="p-6 sm:p-8 max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 bg-white text-slate-900 font-sans leading-normal"
          >
            {/* Company & Report Header */}
            <div className="border-b-2 border-slate-300 pb-4 mb-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
                    {companyName}
                  </h1>
                  <h2 className="text-base sm:text-lg font-bold text-indigo-700 mt-1 uppercase tracking-wide">
                    {showPenalty ? "EMPLOYEE ATTENDANCE & LATE PENALTY REPORT" : "EMPLOYEE ATTENDANCE REPORT"}
                  </h2>
                  <p className="text-base text-slate-700 mt-1">
                    Report Period: <strong className="font-bold text-slate-900">{monthName} {year}</strong>
                  </p>
                </div>
                <div className="text-left sm:text-right text-base text-slate-600 leading-normal">
                  <p>Generated: <span className="font-semibold text-slate-800">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span></p>
                  <p className="font-mono mt-0.5 font-bold text-slate-700">Ref: ATT-{year}{String(month).padStart(2, "0")}-{employee?.id?.slice(-5) || "0000"}</p>
                </div>
              </div>

              {/* Employee Metadata Card */}
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-4 text-base">
                <div>
                  <span className="text-slate-600 block text-sm uppercase tracking-wider font-bold">
                    Employee Name
                  </span>
                  <span className="font-extrabold text-slate-900 text-lg block mt-0.5 leading-snug">
                    {employee?.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 block text-sm uppercase tracking-wider font-bold">
                    Designation
                  </span>
                  <span className="font-semibold text-slate-800 text-base block mt-0.5 leading-snug">
                    {employee?.designation || "Team Member"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 block text-sm uppercase tracking-wider font-bold">
                    Department
                  </span>
                  <span className="font-semibold text-slate-800 text-base block mt-0.5 leading-snug">
                    {employee?.departmentRel?.name || employee?.department || "General"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 block text-sm uppercase tracking-wider font-bold">
                    Assigned Shift
                  </span>
                  <span className="font-semibold text-slate-800 text-base block mt-0.5 leading-snug">
                    {shiftName} ({shiftTimes})
                  </span>
                </div>
              </div>
            </div>

            {/* KPI Summary Strip */}
            <div
              className={`grid gap-2.5 mb-4 text-center ${
                showPenalty && showOvertime
                  ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8"
                  : showPenalty || showOvertime
                  ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7"
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
              }`}
            >
              <div className="p-2.5 rounded-lg border border-slate-300 bg-slate-50">
                <span className="block text-sm uppercase font-bold text-slate-600">Total Days</span>
                <span className="text-2xl font-extrabold text-slate-900">{summary.totalDays}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50/50">
                <span className="block text-sm uppercase font-bold text-emerald-800">Present</span>
                <span className="text-2xl font-extrabold text-emerald-700">{summary.presentCount}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-rose-300 bg-rose-50/60">
                <span className="block text-sm uppercase font-bold text-rose-800">Late Days</span>
                <span className="text-2xl font-extrabold text-rose-700">{summary.lateCount}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-rose-300 bg-rose-50/60">
                <span className="block text-sm uppercase font-bold text-rose-800">Late Time</span>
                <span className="text-2xl font-extrabold text-rose-700">{summary.totalLateMinutes}m</span>
              </div>
              {showPenalty && (
                <div className="p-2.5 rounded-lg border border-rose-400 bg-rose-100/60">
                  <span className="block text-sm uppercase font-bold text-rose-900">Penalty Total</span>
                  <span className="text-2xl font-extrabold text-rose-800">BDT {summary.totalLatePenalty}</span>
                </div>
              )}
              {showOvertime && (
                <div className="p-2.5 rounded-lg border border-indigo-300 bg-indigo-50/60">
                  <span className="block text-sm uppercase font-bold text-indigo-800">Overtime</span>
                  <span className="text-2xl font-extrabold text-indigo-800">{formatMinutes(summary.totalOvertimeMinutes)}</span>
                </div>
              )}
              {/* Separate Holidays KPI */}
              <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50/70">
                <span className="block text-sm uppercase font-bold text-amber-800">Holidays</span>
                <span className="text-2xl font-extrabold text-amber-800">{summary.holidayCount}</span>
              </div>
              {/* Separate Leaves KPI */}
              <div className="p-2.5 rounded-lg border border-blue-300 bg-blue-50/70">
                <span className="block text-sm uppercase font-bold text-blue-800">Leaves</span>
                <span className="text-2xl font-extrabold text-blue-800">{summary.leaveCount || 0}</span>
              </div>
            </div>

            {/* Attendance & Penalty Table */}
            <div className="overflow-hidden border border-slate-300 rounded-lg mb-4">
              <table className="w-full text-left border-collapse text-base">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-800 font-bold text-base">
                    <th className="py-3 px-3 border border-slate-300 text-left whitespace-nowrap min-w-[130px] w-[16%]">
                      Date & Day
                    </th>
                    <th className="py-3 px-3 border border-slate-300 text-center min-w-[100px] w-[11%]">
                      Status
                    </th>
                    <th className="py-3 px-3 border border-slate-300 text-center font-mono whitespace-nowrap min-w-[100px] w-[11%]">
                      In Time
                    </th>
                    <th className="py-3 px-3 border border-slate-300 text-center font-mono whitespace-nowrap min-w-[100px] w-[11%]">
                      Out Time
                    </th>
                    <th className="py-3 px-3 border border-slate-300 text-center font-mono whitespace-nowrap min-w-[95px] w-[10%]">
                      Work Hrs
                    </th>
                    <th className="py-3 px-3 border border-slate-300 text-left min-w-[190px] w-[21%]">
                      Late & Reason
                    </th>
                    {showPenalty && (
                      <th className="py-3 px-3 border border-slate-300 text-center whitespace-nowrap min-w-[110px] w-[11%]">
                        Penalty (BDT)
                      </th>
                    )}
                    {showOvertime && (
                      <th className="py-3 px-3 border border-slate-300 text-center font-mono whitespace-nowrap min-w-[100px] w-[10%]">
                        Overtime
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {records.map((r) => {
                    const dayName = dayNames[r.dayOfWeek];
                    const isLate = r.status === "LATE" || r.lateMinutes > 15;
                    const hasFine = showPenalty && r.latePenalty > 0;
                    const isHoliday = r.status === "HOLIDAY" || (r.isHoliday && r.status !== "PRESENT" && r.status !== "ABSENT" && r.status !== "LEAVE");
                    const isLeave = r.status === "LEAVE" || r.isLeave;
                    const isOverridden = Boolean(r.isHolidayOverridden || (!isHoliday && r.status !== "HOLIDAY" && r.holidayName));

                    return (
                      <tr
                        key={r.date}
                        className={`hover:bg-slate-50 transition-colors ${
                          hasFine
                            ? "bg-rose-50/40"
                            : isHoliday
                            ? "bg-amber-50/60"
                            : isLeave
                            ? "bg-blue-50/60"
                            : r.isWeekend
                            ? "bg-slate-50/70"
                            : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 border border-slate-300 font-semibold text-base align-middle whitespace-nowrap">
                          {String(r.day).padStart(2, "0")} {monthName.slice(0, 3)}, {dayName}
                          {r.holidayName && (
                            <span className="block text-sm text-amber-800 font-bold mt-0.5">
                              ({r.holidayName}{isOverridden ? " - Overridden" : ""})
                            </span>
                          )}
                          {!r.holidayName && isLeave && (
                            <span className="block text-sm text-blue-800 font-bold mt-0.5">
                              (Leave)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 border border-slate-300 text-center align-middle whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md text-base font-bold ${
                              r.status === "PRESENT"
                                ? "bg-emerald-100 text-emerald-800"
                                : r.status === "LATE"
                                ? "bg-rose-100 text-rose-800"
                                : r.status === "HOLIDAY"
                                ? "bg-amber-100 text-amber-800"
                                : r.status === "LEAVE"
                                ? "bg-blue-100 text-blue-800"
                                : r.status === "WEEKEND"
                                ? "bg-slate-200 text-slate-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 border border-slate-300 text-center font-mono text-base align-middle whitespace-nowrap">
                          {formatTime12Hour(r.inTime)}
                        </td>
                        <td className="py-2.5 px-3 border border-slate-300 text-center font-mono text-base align-middle whitespace-nowrap">
                          {formatTime12Hour(r.outTime)}
                        </td>
                        <td className="py-2.5 px-3 border border-slate-300 text-center font-mono text-base align-middle whitespace-nowrap">
                          {r.workingMinutes > 0 ? formatMinutes(r.workingMinutes) : "-"}
                        </td>
                        <td className="py-2.5 px-3 border border-slate-300 text-left font-semibold text-base align-middle">
                          {r.lateMinutes > 0 ? (
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={isLate ? "text-rose-700 font-bold text-base" : "text-slate-600 text-base"}>
                                  {r.lateMinutes}m
                                </span>
                                {r.lateInformed && (
                                  <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Informed
                                  </span>
                                )}
                              </div>
                              {r.lateReason && (
                                <div
                                  className="text-base font-normal text-slate-700 italic leading-snug break-words"
                                  title={r.lateReason}
                                >
                                  Reason: {r.lateReason}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                        {showPenalty && (
                          <td className="py-2.5 px-3 border border-slate-300 text-center font-bold text-base align-middle whitespace-nowrap">
                            {r.lateInformed ? (
                              <span className="inline-block px-2 py-0.5 rounded text-base font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Informed (0)
                              </span>
                            ) : r.latePenalty > 0 ? (
                              <span className="text-rose-700 font-bold text-base">BDT {r.latePenalty}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>
                        )}
                        {showOvertime && (
                          <td className="py-2.5 px-3 border border-slate-300 text-center font-mono text-base align-middle whitespace-nowrap">
                            {r.overtimeMinutes > 0 ? (
                              <span className="text-indigo-700 font-bold text-base">
                                +{formatMinutes(r.overtimeMinutes)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-400 font-bold text-base">
                    <td colSpan={5} className="py-3 px-3 text-right border border-slate-300 text-slate-900 font-bold text-base">
                      Monthly Total:
                    </td>
                    <td className="py-3 px-3 text-left border border-slate-300 text-rose-800 font-bold text-base">
                      {summary.totalLateMinutes}m total late
                    </td>
                    {showPenalty && (
                      <td className="py-3 px-3 text-center border border-slate-300 text-rose-800 font-bold text-base whitespace-nowrap">
                        BDT {summary.totalLatePenalty}
                      </td>
                    )}
                    {showOvertime && (
                      <td className="py-3 px-3 text-center border border-slate-300 text-indigo-800 font-bold text-base whitespace-nowrap font-mono">
                        +{formatMinutes(summary.totalOvertimeMinutes)}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Late Penalty Rule Explanation Note */}
            {showPenalty && (
              <div className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-700 mb-4">
                <span className="font-bold text-slate-900">
                  Penalty Policy:{" "}
                </span>
                <span>
                  1-15m: Grace (BDT 0) • 16-20m: Flat BDT 20 • 21-30m: Flat BDT 30 • 31m+: BDT 30 + (t × 2) where t is minutes beyond 30 min. (Penalty is waived when Late Informed is marked).
                </span>
              </div>
            )}

            {/* Signatures Block */}
            <div className="grid grid-cols-3 gap-8 pt-6 border-t-2 border-slate-300 text-center text-base text-slate-800 mt-6">
              <div>
                <div className="border-b-2 border-slate-400 w-44 mx-auto mb-2 h-8"></div>
                <span className="font-bold text-slate-900 block text-base">Employee Signature</span>
                <span className="text-sm text-slate-500">Date: ____________</span>
              </div>
              <div>
                <div className="border-b-2 border-slate-400 w-44 mx-auto mb-2 h-8"></div>
                <span className="font-bold text-slate-900 block text-base">Department Head</span>
                <span className="text-sm text-slate-500">Date: ____________</span>
              </div>
              <div>
                <div className="border-b-2 border-slate-400 w-44 mx-auto mb-2 h-8"></div>
                <span className="font-bold text-slate-900 block text-base">HR & Accounts Authority</span>
                <span className="text-sm text-slate-500">Date: ____________</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
