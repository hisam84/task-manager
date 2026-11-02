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
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

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
              margin: ${orientation === "portrait" ? "3mm 5mm 3mm 5mm" : "4mm 6mm"};
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
              font-size: 8.5px !important;
              line-height: 1.15 !important;
              height: 100% !important;
              max-height: 100% !important;
              overflow: hidden !important;
            }
            #attendance-printable-area {
              display: block !important;
              visibility: visible !important;
              width: 100% !important;
              max-width: 100% !important;
              max-height: 290mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              overflow: hidden !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            td, th {
              padding: 1.5px 3px !important;
              line-height: 1.15 !important;
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
              margin: ${orientation === "portrait" ? "3mm 5mm 3mm 5mm" : "4mm 6mm"};
            }
            @media print {
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                height: 100% !important;
                max-height: 100% !important;
                font-size: 8.5px !important;
                line-height: 1.15 !important;
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
                max-height: 290mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              td, th {
                padding: 1.5px 3px !important;
              }
            }
          `,
        }}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static">
        <div className="relative w-full max-w-4xl lg:max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black">
          {/* Modal Toolbar - Hidden during print */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 print:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-xs">
                <Printer className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                  {showPenalty ? "Attendance & Late Penalty Report" : "Attendance Report"}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                  1-Page A4 Guaranteed
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Orientation Switcher */}
              <div className="inline-flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setOrientation("portrait")}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    orientation === "portrait"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                  title="Portrait: Standard 1-page A4 format"
                >
                  <Layout className="w-3.5 h-3.5" />
                  Portrait (1-Page)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("landscape")}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    orientation === "landscape"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                  title="Landscape: Wider layout"
                >
                  <Layout className="w-3.5 h-3.5 rotate-90" />
                  Landscape
                </button>
              </div>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF (1 Page)
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-8 min-w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Document Container - Calibrated strictly for 1-Page A4 */}
          <div
            id="attendance-printable-area"
            className="p-3 sm:p-5 max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-hidden print:p-0 bg-white text-slate-900 font-sans leading-tight"
          >
            {/* Company & Report Header */}
            <div className="border-b border-slate-300 pb-1.5 mb-1.5">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-1">
                <div>
                  <h1 className="text-base sm:text-lg print:text-base font-black tracking-tight text-slate-900 leading-tight">
                    {companyName}
                  </h1>
                  <h2 className="text-[10px] print:text-[9.5px] font-bold text-indigo-700 uppercase tracking-wide">
                    {showPenalty ? "EMPLOYEE ATTENDANCE & LATE PENALTY REPORT" : "EMPLOYEE ATTENDANCE REPORT"}
                  </h2>
                  <p className="text-[9.5px] print:text-[9px] text-slate-600 mt-0.5">
                    Report Period: <strong className="font-bold text-slate-900">{monthName} {year}</strong>
                  </p>
                </div>
                <div className="text-left sm:text-right text-[9px] print:text-[8.5px] text-slate-500 leading-tight">
                  <p>Generated: <span className="font-semibold text-slate-700">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span></p>
                  <p className="font-mono mt-0.5 font-semibold text-slate-700">Ref: ATT-{year}{String(month).padStart(2, "0")}-{employee?.id?.slice(-5) || "0000"}</p>
                </div>
              </div>

              {/* Employee Metadata Strip */}
              <div className="mt-1.5 p-1.5 rounded bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs print:p-1 print:bg-slate-50 print:border-slate-300">
                <div>
                  <span className="text-slate-500 block text-[8px] print:text-[7.5px] uppercase tracking-wider font-semibold">
                    Employee Name
                  </span>
                  <span className="font-bold text-slate-900 text-[11px] print:text-[10px] block leading-tight">
                    {employee?.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[8px] print:text-[7.5px] uppercase tracking-wider font-semibold">
                    Designation
                  </span>
                  <span className="font-semibold text-slate-800 text-[10.5px] print:text-[9.5px] block leading-tight">
                    {employee?.designation || "Team Member"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[8px] print:text-[7.5px] uppercase tracking-wider font-semibold">
                    Department
                  </span>
                  <span className="font-semibold text-slate-800 text-[10.5px] print:text-[9.5px] block leading-tight">
                    {employee?.departmentRel?.name || employee?.department || "General"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[8px] print:text-[7.5px] uppercase tracking-wider font-semibold">
                    Assigned Shift
                  </span>
                  <span className="font-semibold text-slate-800 text-[10.5px] print:text-[9.5px] block leading-tight">
                    {shiftName} ({shiftTimes})
                  </span>
                </div>
              </div>
            </div>

            {/* KPI Summary Strip */}
            <div
              className={`grid gap-1 mb-1.5 text-center ${
                showPenalty && showOvertime
                  ? "grid-cols-4 sm:grid-cols-8"
                  : showPenalty || showOvertime
                  ? "grid-cols-3 sm:grid-cols-7"
                  : "grid-cols-3 sm:grid-cols-6"
              }`}
            >
              <div className="p-1 rounded border border-slate-200 bg-slate-50">
                <span className="block text-[8px] print:text-[7.5px] uppercase font-bold text-slate-500 leading-none">Total Days</span>
                <span className="text-xs print:text-[10px] font-bold text-slate-900 leading-tight mt-0.5 block">{summary.totalDays}</span>
              </div>
              <div className="p-1 rounded border border-emerald-200 bg-emerald-50/50">
                <span className="block text-[8px] print:text-[7.5px] uppercase font-bold text-emerald-700 leading-none">Present</span>
                <span className="text-xs print:text-[10px] font-bold text-emerald-700 leading-tight mt-0.5 block">{summary.presentCount}</span>
              </div>
              <div className="p-1 rounded border border-rose-200 bg-rose-50/50">
                <span className="block text-[8px] print:text-[7.5px] uppercase font-bold text-rose-600 leading-none">Late Days</span>
                <span className="text-xs print:text-[10px] font-bold text-rose-700 leading-tight mt-0.5 block">{summary.lateCount}</span>
              </div>
              <div className="p-1 rounded border border-rose-200 bg-rose-50/50">
                <span className="block text-[8px] print:text-[7.5px] uppercase font-bold text-rose-600 leading-none">Late Time</span>
                <span className="text-xs print:text-[10px] font-bold text-rose-700 leading-tight mt-0.5 block">{summary.totalLateMinutes}m</span>
              </div>
              {showPenalty && (
                <div className="p-1 rounded border border-rose-300 bg-rose-50">
                  <span className="block text-[8px] print:text-[7.5px] uppercase font-bold text-rose-700 leading-none">Penalty Total</span>
                  <span className="text-xs print:text-[10px] font-bold text-rose-800 leading-tight mt-0.5 block">BDT {summary.totalLatePenalty}</span>
                </div>
              )}
              {showOvertime && (
                <div className="p-1 rounded border border-indigo-200 bg-indigo-50/50">
                  <span className="block text-[8px] print:text-[7.5px] uppercase font-bold text-indigo-700 leading-none">Overtime</span>
                  <span className="text-xs print:text-[10px] font-bold text-indigo-800 leading-tight mt-0.5 block">{formatMinutes(summary.totalOvertimeMinutes)}</span>
                </div>
              )}
              <div className="p-1 rounded border border-amber-300 bg-amber-50/60">
                <span className="block text-[8px] print:text-[7.5px] uppercase font-bold text-amber-700 leading-none">Holidays</span>
                <span className="text-xs print:text-[10px] font-bold text-amber-800 leading-tight mt-0.5 block">{summary.holidayCount}</span>
              </div>
              <div className="p-1 rounded border border-blue-300 bg-blue-50/60">
                <span className="block text-[8px] print:text-[7.5px] uppercase font-bold text-blue-700 leading-none">Leaves</span>
                <span className="text-xs print:text-[10px] font-bold text-blue-800 leading-tight mt-0.5 block">{summary.leaveCount || 0}</span>
              </div>
            </div>

            {/* Attendance & Penalty Table - 1-Page Vertical Fit */}
            <div className="overflow-hidden border border-slate-300 rounded mb-1.5">
              <table className="w-full text-left border-collapse text-[9px] print:text-[8px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-[9px] print:text-[8px]">
                    <th className="py-1 px-1.5 border-r border-slate-300 text-left whitespace-nowrap min-w-[95px] w-[17%]">
                      Date & Day
                    </th>
                    <th className="py-1 px-1.5 border-r border-slate-300 text-center whitespace-nowrap min-w-[65px] w-[11%]">
                      Status
                    </th>
                    <th className="py-1 px-1.5 border-r border-slate-300 text-center font-mono whitespace-nowrap min-w-[65px] w-[11%]">
                      In Time
                    </th>
                    <th className="py-1 px-1.5 border-r border-slate-300 text-center font-mono whitespace-nowrap min-w-[65px] w-[11%]">
                      Out Time
                    </th>
                    <th className="py-1 px-1.5 border-r border-slate-300 text-center font-mono whitespace-nowrap min-w-[60px] w-[10%]">
                      Work Hrs
                    </th>
                    <th className="py-1 px-1.5 border-r border-slate-300 text-left min-w-[120px] w-[21%]">
                      Late & Reason
                    </th>
                    {showPenalty && (
                      <th className="py-1 px-1.5 border-r border-slate-300 text-center whitespace-nowrap min-w-[75px] w-[10%]">
                        Penalty
                      </th>
                    )}
                    {showOvertime && (
                      <th className="py-1 px-1.5 text-center font-mono whitespace-nowrap min-w-[65px] w-[9%]">
                        Overtime
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
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
                        className={`hover:bg-slate-50 leading-tight ${
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
                        <td className="py-[1.5px] px-1.5 border-r border-slate-200 font-medium whitespace-nowrap">
                          {String(r.day).padStart(2, "0")} {monthName.slice(0, 3)}, {dayName}
                          {r.holidayName && (
                            <span className="text-[7.5px] text-amber-700 font-bold ml-1">
                              ({r.holidayName}{isOverridden ? " - Overridden" : ""})
                            </span>
                          )}
                          {!r.holidayName && isLeave && (
                            <span className="text-[7.5px] text-blue-700 font-bold ml-1">
                              (Leave)
                            </span>
                          )}
                        </td>
                        <td className="py-[1.5px] px-1.5 border-r border-slate-200 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-1 py-0 rounded text-[8px] print:text-[7.5px] font-bold ${
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
                        <td className="py-[1.5px] px-1.5 border-r border-slate-200 text-center font-mono whitespace-nowrap">
                          {formatTime12Hour(r.inTime)}
                        </td>
                        <td className="py-[1.5px] px-1.5 border-r border-slate-200 text-center font-mono whitespace-nowrap">
                          {formatTime12Hour(r.outTime)}
                        </td>
                        <td className="py-[1.5px] px-1.5 border-r border-slate-200 text-center font-mono whitespace-nowrap">
                          {r.workingMinutes > 0 ? formatMinutes(r.workingMinutes) : "-"}
                        </td>
                        <td className="py-[1.5px] px-1.5 border-r border-slate-200 text-left">
                          {r.lateMinutes > 0 ? (
                            <div className="flex items-center gap-1">
                              <span className={isLate ? "text-rose-700 font-bold" : "text-slate-600 font-medium"}>
                                {r.lateMinutes}m
                              </span>
                              {r.lateInformed && (
                                <span className="text-[7px] px-1 py-0 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Inf
                                </span>
                              )}
                              {r.lateReason && (
                                <span
                                  className="text-[7.5px] text-slate-500 font-normal italic truncate max-w-[130px]"
                                  title={r.lateReason}
                                >
                                  {r.lateReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                        {showPenalty && (
                          <td className="py-[1.5px] px-1.5 border-r border-slate-200 text-center font-bold whitespace-nowrap">
                            {r.lateInformed ? (
                              <span className="text-emerald-700 text-[8px] font-semibold">
                                Informed (0)
                              </span>
                            ) : r.latePenalty > 0 ? (
                              <span className="text-rose-700">BDT {r.latePenalty}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>
                        )}
                        {showOvertime && (
                          <td className="py-[1.5px] px-1.5 text-center font-mono whitespace-nowrap">
                            {r.overtimeMinutes > 0 ? (
                              <span className="text-indigo-700 font-medium">
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
                  <tr className="bg-slate-100 border-t border-slate-300 font-bold text-[9px] print:text-[8px]">
                    <td colSpan={5} className="py-1 px-1.5 text-right border-r border-slate-300">
                      Monthly Total:
                    </td>
                    <td className="py-1 px-1.5 text-left border-r border-slate-300 text-rose-800">
                      {summary.totalLateMinutes}m
                    </td>
                    {showPenalty && (
                      <td className="py-1 px-1.5 text-center border-r border-slate-300 text-rose-800 font-bold whitespace-nowrap">
                        BDT {summary.totalLatePenalty}
                      </td>
                    )}
                    {showOvertime && (
                      <td className="py-1 px-1.5 text-center text-indigo-800 font-mono whitespace-nowrap">
                        +{formatMinutes(summary.totalOvertimeMinutes)}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Late Penalty Policy Note */}
            {showPenalty && (
              <div className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[7.5px] print:text-[7px] text-slate-600 mb-1.5">
                <span className="font-semibold text-slate-800">
                  Penalty Policy:{" "}
                </span>
                <span>
                  1-15m: Grace (BDT 0) • 16-20m: Flat BDT 20 • 21-30m: Flat BDT 30 • 31m+: BDT 30 + (t × 2). Waived when marked Informed.
                </span>
              </div>
            )}

            {/* Signatures Block - Compact & Elegant */}
            <div className="grid grid-cols-3 gap-6 pt-1.5 border-t border-slate-300 text-center text-xs text-slate-700 mt-1">
              <div>
                <div className="border-b border-slate-400 w-28 mx-auto mb-0.5 h-4"></div>
                <span className="font-semibold text-slate-800 block text-[8.5px] print:text-[8px]">Employee Signature</span>
                <span className="text-[7.5px] print:text-[7px] text-slate-400">Date: ____________</span>
              </div>
              <div>
                <div className="border-b border-slate-400 w-28 mx-auto mb-0.5 h-4"></div>
                <span className="font-semibold text-slate-800 block text-[8.5px] print:text-[8px]">Department Head</span>
                <span className="text-[7.5px] print:text-[7px] text-slate-400">Date: ____________</span>
              </div>
              <div>
                <div className="border-b border-slate-400 w-28 mx-auto mb-0.5 h-4"></div>
                <span className="font-semibold text-slate-800 block text-[8.5px] print:text-[8px]">HR & Accounts Authority</span>
                <span className="text-[7.5px] print:text-[7px] text-slate-400">Date: ____________</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
