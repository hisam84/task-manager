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
              margin: ${orientation === "portrait" ? "2.5mm 4mm 2.5mm 4mm" : "4mm 6mm"};
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
              max-height: 291mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              overflow: hidden !important;
              font-size: 16px !important;
              line-height: 1.15 !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              table-layout: auto !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            td, th {
              padding: 1px 3px !important;
              line-height: 1.15 !important;
              font-size: 16px !important;
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
              margin: ${orientation === "portrait" ? "2.5mm 4mm 2.5mm 4mm" : "4mm 6mm"};
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
                font-size: 16px !important;
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
                max-height: 291mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                font-size: 16px !important;
                line-height: 1.15 !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                table-layout: auto !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              td, th {
                padding: 1px 3px !important;
                line-height: 1.15 !important;
                font-size: 16px !important;
              }
            }
          `,
        }}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static">
        <div className="relative w-full max-w-4xl lg:max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black">
          {/* Modal Toolbar - Hidden during print */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 print:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-xs">
                <Printer className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                  {showPenalty ? "Attendance & Late Penalty Report" : "Attendance Report"}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                  16px Font • 1-Page A4
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
                  title="Portrait: 1-Page A4"
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

          {/* Printable Document Container - Strictly 1-Page A4 Fit with min 16px Font */}
          <div
            id="attendance-printable-area"
            className="p-3 sm:p-4 max-h-[88vh] overflow-y-auto print:max-h-none print:overflow-hidden print:p-0 bg-white text-slate-900 font-sans leading-tight text-[16px] print:text-[16px]"
          >
            {/* Header: Company Name, Title & Metadata */}
            <div className="border-b border-slate-300 pb-1 mb-1">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-1">
                <div>
                  <h1 className="text-xl sm:text-2xl print:text-[20px] font-black tracking-tight text-slate-900 leading-tight">
                    {companyName}
                  </h1>
                  <h2 className="text-[16px] print:text-[16px] font-bold text-indigo-700 uppercase tracking-wide">
                    {showPenalty ? "EMPLOYEE ATTENDANCE & LATE PENALTY REPORT" : "EMPLOYEE ATTENDANCE REPORT"}
                  </h2>
                  <p className="text-[16px] print:text-[16px] text-slate-600 mt-0.5">
                    Report Period: <strong className="font-bold text-slate-900">{monthName} {year}</strong>
                  </p>
                </div>
                <div className="text-left sm:text-right text-[14px] print:text-[13px] text-slate-500 leading-tight">
                  <p>Generated: <span className="font-semibold text-slate-700">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span></p>
                  <p className="font-mono mt-0.5 font-semibold text-slate-700">Ref: ATT-{year}{String(month).padStart(2, "0")}-{employee?.id?.slice(-5) || "0000"}</p>
                </div>
              </div>
            </div>

            {/* Employee Information Table */}
            <table className="w-full table-auto border-collapse border border-slate-300 text-[16px] print:text-[16px] leading-tight mb-1">
              <tbody>
                <tr className="bg-slate-50/80">
                  <td className="py-1 px-2.5 border-r border-slate-300">
                    <span className="text-[12px] print:text-[12px] text-slate-500 uppercase font-bold block tracking-wider">Employee Name</span>
                    <span className="font-black text-[16px] print:text-[16px] text-slate-900 block truncate">{employee?.name}</span>
                  </td>
                  <td className="py-1 px-2.5 border-r border-slate-300">
                    <span className="text-[12px] print:text-[12px] text-slate-500 uppercase font-bold block tracking-wider">Designation</span>
                    <span className="font-semibold text-[16px] print:text-[16px] text-slate-800 block truncate">{employee?.designation || "Team Member"}</span>
                  </td>
                  <td className="py-1 px-2.5 border-r border-slate-300">
                    <span className="text-[12px] print:text-[12px] text-slate-500 uppercase font-bold block tracking-wider">Department</span>
                    <span className="font-semibold text-[16px] print:text-[16px] text-slate-800 block truncate">{employee?.departmentRel?.name || employee?.department || "General"}</span>
                  </td>
                  <td className="py-1 px-2.5">
                    <span className="text-[12px] print:text-[12px] text-slate-500 uppercase font-bold block tracking-wider">Assigned Shift</span>
                    <span className="font-semibold text-[16px] print:text-[16px] text-slate-800 block truncate">{shiftName} ({shiftTimes})</span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Monthly Attendance Summary Metrics Table */}
            <table className="w-full table-auto border-collapse border border-slate-300 text-[16px] print:text-[16px] text-center leading-tight mb-1.5">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[12px] print:text-[12px] uppercase font-bold text-slate-600">
                  <th className="py-0.5 px-1.5 border-r border-slate-300">Total Days</th>
                  <th className="py-0.5 px-1.5 border-r border-slate-300 text-emerald-700">Present</th>
                  <th className="py-0.5 px-1.5 border-r border-slate-300 text-rose-600">Late Days</th>
                  <th className="py-0.5 px-1.5 border-r border-slate-300 text-rose-600">Late Time</th>
                  {showPenalty && (
                    <th className="py-0.5 px-1.5 border-r border-slate-300 text-rose-700">Penalty Total</th>
                  )}
                  {showOvertime && (
                    <th className="py-0.5 px-1.5 border-r border-slate-300 text-indigo-700">Overtime</th>
                  )}
                  <th className="py-0.5 px-1.5 border-r border-slate-300 text-amber-700">Holidays</th>
                  <th className="py-0.5 px-1.5 text-blue-700">Leaves</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-bold text-[16px] print:text-[16px] bg-white">
                  <td className="py-0.5 px-1.5 border-r border-slate-300 text-slate-900">{summary.totalDays}</td>
                  <td className="py-0.5 px-1.5 border-r border-slate-300 text-emerald-700 bg-emerald-50/40">{summary.presentCount}</td>
                  <td className="py-0.5 px-1.5 border-r border-slate-300 text-rose-700 bg-rose-50/40">{summary.lateCount}</td>
                  <td className="py-0.5 px-1.5 border-r border-slate-300 text-rose-700 bg-rose-50/40">{summary.totalLateMinutes}m</td>
                  {showPenalty && (
                    <td className="py-0.5 px-1.5 border-r border-slate-300 text-rose-700 bg-rose-100/50 font-black">BDT {summary.totalLatePenalty}</td>
                  )}
                  {showOvertime && (
                    <td className="py-0.5 px-1.5 border-r border-slate-300 text-indigo-800 bg-indigo-50/40">{formatMinutes(summary.totalOvertimeMinutes)}</td>
                  )}
                  <td className="py-0.5 px-1.5 border-r border-slate-300 text-amber-800 bg-amber-50/50">{summary.holidayCount}</td>
                  <td className="py-0.5 px-1.5 text-blue-800 bg-blue-50/50">{summary.leaveCount || 0}</td>
                </tr>
              </tbody>
            </table>

            {/* Attendance & Penalty Table - Dynamic Column Sizing with >=16px text */}
            <div className="overflow-hidden border border-slate-300 rounded mb-1">
              <table className="w-full table-auto text-left border-collapse text-[16px] print:text-[16px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-[16px] print:text-[16px]">
                    <th className="py-1 px-2 border-r border-slate-300 text-left whitespace-nowrap">
                      Date & Day
                    </th>
                    <th className="py-1 px-2 border-r border-slate-300 text-center whitespace-nowrap">
                      Status
                    </th>
                    <th className="py-1 px-2 border-r border-slate-300 text-center font-mono whitespace-nowrap">
                      In Time
                    </th>
                    <th className="py-1 px-2 border-r border-slate-300 text-center font-mono whitespace-nowrap">
                      Out Time
                    </th>
                    <th className="py-1 px-2 border-r border-slate-300 text-center font-mono whitespace-nowrap">
                      Work Hrs
                    </th>
                    <th className="py-1 px-2.5 border-r border-slate-300 text-left w-full">
                      Late & Reason
                    </th>
                    {showPenalty && (
                      <th className="py-1 px-2 border-r border-slate-300 text-center whitespace-nowrap">
                        Penalty (BDT)
                      </th>
                    )}
                    {showOvertime && (
                      <th className="py-1 px-2 text-center font-mono whitespace-nowrap">
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
                        <td className="py-0.5 px-2 border-r border-slate-200 font-medium whitespace-nowrap text-[16px] print:text-[16px]">
                          {String(r.day).padStart(2, "0")} {monthName.slice(0, 3)}, {dayName}
                          {r.holidayName && (
                            <span className="text-[13px] text-amber-700 font-bold ml-1.5">
                              ({r.holidayName}{isOverridden ? " - Overridden" : ""})
                            </span>
                          )}
                          {!r.holidayName && isLeave && (
                            <span className="text-[13px] text-blue-700 font-bold ml-1.5">
                              (Leave)
                            </span>
                          )}
                        </td>
                        <td className="py-0.5 px-2 border-r border-slate-200 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[14px] print:text-[14px] font-bold ${
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
                        <td className="py-0.5 px-2 border-r border-slate-200 text-center font-mono whitespace-nowrap font-medium text-[16px] print:text-[16px]">
                          {formatTime12Hour(r.inTime) || "--:--"}
                        </td>
                        <td className="py-0.5 px-2 border-r border-slate-200 text-center font-mono whitespace-nowrap font-medium text-[16px] print:text-[16px]">
                          {formatTime12Hour(r.outTime) || "--:--"}
                        </td>
                        <td className="py-0.5 px-2 border-r border-slate-200 text-center font-mono whitespace-nowrap font-medium text-[16px] print:text-[16px]">
                          {r.workingMinutes > 0 ? formatMinutes(r.workingMinutes) : "-"}
                        </td>
                        <td className="py-0.5 px-2.5 border-r border-slate-200 text-left text-[16px] print:text-[16px]">
                          {r.lateMinutes > 0 ? (
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className={isLate ? "text-rose-700 font-bold" : "text-slate-600 font-medium"}>
                                {r.lateMinutes}m
                              </span>
                              {r.lateInformed && (
                                <span className="text-[12px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Informed
                                </span>
                              )}
                              {r.lateReason && (
                                <span
                                  className="text-[14px] text-slate-600 font-medium italic break-words"
                                  title={r.lateReason}
                                >
                                  — {r.lateReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                        {showPenalty && (
                          <td className="py-0.5 px-2 border-r border-slate-200 text-center font-bold whitespace-nowrap text-[16px] print:text-[16px]">
                            {r.lateInformed ? (
                              <span className="text-emerald-700 text-[14px] font-bold">
                                Informed (0)
                              </span>
                            ) : r.latePenalty > 0 ? (
                              <span className="text-rose-700 font-black">BDT {r.latePenalty}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>
                        )}
                        {showOvertime && (
                          <td className="py-0.5 px-2 text-center font-mono whitespace-nowrap font-semibold text-[16px] print:text-[16px]">
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
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-[16px] print:text-[16px]">
                    <td colSpan={5} className="py-1 px-2 text-right border-r border-slate-300 text-slate-800 font-bold">
                      Monthly Total:
                    </td>
                    <td className="py-1 px-2.5 text-left border-r border-slate-300 text-rose-800 font-extrabold">
                      {summary.totalLateMinutes}m total late
                    </td>
                    {showPenalty && (
                      <td className="py-1 px-2 text-center border-r border-slate-300 text-rose-800 font-black whitespace-nowrap">
                        BDT {summary.totalLatePenalty}
                      </td>
                    )}
                    {showOvertime && (
                      <td className="py-1 px-2 text-center text-indigo-800 font-mono font-bold whitespace-nowrap">
                        +{formatMinutes(summary.totalOvertimeMinutes)}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Late Penalty Policy Note */}
            {showPenalty && (
              <div className="px-2.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[13px] print:text-[13px] text-slate-600 mb-1">
                <span className="font-bold text-slate-800">
                  Penalty Policy:{" "}
                </span>
                <span>
                  1-15m: Grace (BDT 0) • 16-20m: Flat BDT 20 • 21-30m: Flat BDT 30 • 31m+: BDT 30 + (t × 2). Waived when marked Informed.
                </span>
              </div>
            )}

            {/* Signatures Block - Bottom-aligned with clear signing space */}
            <div className="grid grid-cols-3 gap-6 pt-1.5 border-t border-slate-300 text-center text-[16px] print:text-[16px] text-slate-700 mt-0.5">
              <div>
                <div className="border-b border-slate-400 w-36 mx-auto mb-1 h-5"></div>
                <span className="font-bold text-slate-800 block text-[16px] print:text-[16px]">Employee Signature</span>
                <span className="text-[13px] print:text-[13px] text-slate-400">Date: ____________</span>
              </div>
              <div>
                <div className="border-b border-slate-400 w-36 mx-auto mb-1 h-5"></div>
                <span className="font-bold text-slate-800 block text-[16px] print:text-[16px]">Department Head</span>
                <span className="text-[13px] print:text-[13px] text-slate-400">Date: ____________</span>
              </div>
              <div>
                <div className="border-b border-slate-400 w-36 mx-auto mb-1 h-5"></div>
                <span className="font-bold text-slate-800 block text-[16px] print:text-[16px]">HR & Accounts Authority</span>
                <span className="text-[13px] print:text-[13px] text-slate-400">Date: ____________</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
