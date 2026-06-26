"use client";

/**
 * 周末错题反馈表 · 学生表视图
 * 来源：docs/stages/weekend-mistake-table-v0.md Stage 1
 *
 * 表格结构（5 列）：
 *   序号 | 姓名 | 特殊情况（dropdown） | 错题（C 列 · 用户手动填） | 反馈（D 列 · Stage 3 AI 填）
 *
 * 交互逻辑：
 * - 特殊情况 = normal → 错题 input 启用
 * - 特殊情况 = allCorrect → 错题 input 禁用（标"全对"）
 * - 特殊情况 = onlineCourse/onlineReview/onlineLast/notSubmitted/other → 错题 input 禁用
 * - 特殊情况 = other → 弹出文本框填 statusNote
 * - 反馈 D 列：v0.1 只展示用户手动填的（Stage 3 接 AI 后由 AI 写入）
 *
 * 移动端：表格可横滑（最小列宽）
 */

import { useState } from "react";
import {
  WEEKEND_STATUS_OPTIONS,
  isQNumbersLocked,
  type WeekendStudent,
  type WeekendStatus,
} from "@/lib/mistake/weekend-types";

export function WeekendStudentTable({
  sheetName: _sheetName,
  students,
  onStudentChange,
}: {
  sheetName: string;
  students: WeekendStudent[];
  onStudentChange: (rowIndex: number, patch: Partial<WeekendStudent>) => void;
}) {
  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-hairline bg-canvas-alt/30 p-8 text-center text-sm text-ink-muted">
        这个 Sheet 没有学生数据
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-hairline overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="bg-canvas-alt/50 border-b border-hairline">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted w-16">
                序号
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted w-28">
                姓名
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted w-40">
                特殊情况
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted min-w-[180px]">
                错题（C 列 · 手动填）
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted min-w-[200px]">
                反馈（D 列 · Stage 3 AI）
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <WeekendStudentRow
                key={student.rowIndex}
                student={student}
                onChange={(patch) => onStudentChange(student.rowIndex, patch)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WeekendStudentRow({
  student,
  onChange,
}: {
  student: WeekendStudent;
  onChange: (patch: Partial<WeekendStudent>) => void;
}) {
  const [showOtherInput, setShowOtherInput] = useState(
    student.status === "other",
  );
  const qLocked = isQNumbersLocked(student.status);

  const handleStatusChange = (newStatus: WeekendStatus) => {
    setShowOtherInput(newStatus === "other");
    onChange({
      status: newStatus,
      // 切换到"其他"时保留已有 note，切换出去时清空
      statusNote: newStatus === "other" ? student.statusNote : "",
      // 锁定时清空错题
      qNumbersInput: isQNumbersLocked(newStatus) ? "" : student.qNumbersInput,
    });
  };

  return (
    <tr className="border-b border-hairline last:border-b-0 hover:bg-canvas-alt/30 transition">
      {/* 序号 */}
      <td className="px-3 py-2 align-top">
        <input
          type="text"
          value={student.serialNumber}
          onChange={(e) => onChange({ serialNumber: e.target.value })}
          placeholder="—"
          className="w-12 text-sm px-2 py-1 rounded border border-hairline bg-white focus:outline-none focus:ring-1 focus:ring-accent/40 text-center"
        />
      </td>

      {/* 姓名 */}
      <td className="px-3 py-2 align-top">
        <div className="text-sm font-medium text-ink truncate max-w-[8rem]">
          {student.name}
        </div>
      </td>

      {/* 特殊情况 dropdown */}
      <td className="px-3 py-2 align-top">
        <select
          value={student.status}
          onChange={(e) => handleStatusChange(e.target.value as WeekendStatus)}
          className={`
            w-full text-sm px-2 py-1 rounded border focus:outline-none focus:ring-1 focus:ring-accent/40
            ${
              student.status === "normal"
                ? "bg-white border-hairline text-ink"
                : "bg-warning-soft border-warning/30 text-warning-text"
            }
          `}
        >
          {WEEKEND_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {showOtherInput && (
          <input
            type="text"
            value={student.statusNote}
            onChange={(e) => onChange({ statusNote: e.target.value })}
            placeholder="（填具体情况，如医院/转学）"
            className="mt-1 w-full text-xs px-2 py-1 rounded border border-warning/30 bg-white focus:outline-none focus:ring-1 focus:ring-warning/40"
          />
        )}
      </td>

      {/* 错题（C 列 · 手动填） */}
      <td className="px-3 py-2 align-top">
        {qLocked ? (
          <div className="text-xs text-ink-muted italic px-2 py-1.5 rounded bg-canvas-alt/50">
            {student.status === "allCorrect"
              ? "✓ 全对（无需填错题）"
              : `🔒 ${student.statusNote ? student.statusNote : "已锁定"}`}
          </div>
        ) : (
          <input
            type="text"
            value={student.qNumbersInput}
            onChange={(e) => onChange({ qNumbersInput: e.target.value })}
            placeholder="如：3，6 或 1，3，5，6"
            className="w-full text-sm px-2 py-1 rounded border border-hairline bg-white focus:outline-none focus:ring-1 focus:ring-accent/40 font-mono"
          />
        )}
      </td>

      {/* 反馈（D 列 · Stage 3 AI） */}
      <td className="px-3 py-2 align-top">
        <textarea
          value={student.feedback}
          onChange={(e) => onChange({ feedback: e.target.value })}
          placeholder={
            isAiPlaceholder(student.status)
              ? "（特殊情况不生成 AI 反馈，最后手动合并单元格写小结）"
              : "Stage 3 AI 自动填入 / 你也可以手动写"
          }
          rows={2}
          className={`
            w-full text-xs px-2 py-1.5 rounded border bg-white focus:outline-none focus:ring-1 focus:ring-accent/40 resize-none
            ${isAiPlaceholder(student.status) ? "border-hairline text-ink-muted" : "border-hairline"}
          `}
        />
      </td>
    </tr>
  );
}

function isAiPlaceholder(status: WeekendStatus): boolean {
  return (
    status === "onlineCourse" ||
    status === "onlineReview" ||
    status === "onlineLast" ||
    status === "notSubmitted" ||
    status === "other"
  );
}