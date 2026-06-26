"use client";

/**
 * 周末错题反馈表 · 学生表视图（v0.2 简化版）
 * 来源：docs/stages/weekend-mistake-table-v0.md + 用户 2026-06-26 反馈
 *
 * v0.2 简化：
 * - 去掉特殊情况 dropdown（用户原话："特殊情况不用单独列，到时候填到题号列里"）
 * - C 列改成"单一 input + 快捷按钮组"（5 个特殊值 + 用户自由输入题号）
 * - 添加自动排序按钮
 * - D 列保留为 textarea（v0.1 没变）
 *
 * 自动排序逻辑见 weekend-types.ts: sortStudentsByCellValue()
 */

import {
  QUICK_FILL_OPTIONS,
  classifyCellValue,
  shouldSkipAiFeedback,
  type WeekendStudent,
} from "@/lib/mistake/weekend-types";

export function WeekendStudentTable({
  students,
  onStudentChange,
  onAutoSort,
}: {
  students: WeekendStudent[];
  onStudentChange: (rowIndex: number, patch: Partial<WeekendStudent>) => void;
  onAutoSort: () => void;
}) {
  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-hairline bg-canvas-alt/30 p-8 text-center text-sm text-ink-muted">
        这个 Sheet 没有学生数据
      </div>
    );
  }

  // 统计已填数量（用于显示在排序按钮旁边）
  const filledCount = students.filter(
    (s) => s.qNumbersInput.trim() !== "" || s.feedback.trim() !== "",
  ).length;

  return (
    <div className="space-y-3">
      {/* 顶部工具栏：自动排序 + 已填统计 */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-ink-muted">
          共 {students.length} 人 · 已填 {filledCount} 人
        </div>
        <button
          type="button"
          onClick={onAutoSort}
          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-accent-soft text-accent-ink hover:bg-accent-text hover:text-white transition"
          title="按 C 列自动排序：有题号(数字升序) → 全对 → 网课 → 作业未交 → 留空"
        >
          ↕️ 自动排序
        </button>
      </div>

      <div className="rounded-xl border border-hairline overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-canvas-alt/50 border-b border-hairline">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted w-14">
                  序号
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted w-28">
                  姓名
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted min-w-[260px]">
                  错题（C 列 · 题号/特殊值）
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted min-w-[220px]">
                  反馈（D 列 · Stage 3 AI 接入）
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <WeekendStudentRow
                  key={student.rowIndex}
                  student={student}
                  onChange={(patch) =>
                    onStudentChange(student.rowIndex, patch)
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
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
  const category = classifyCellValue(student.qNumbersInput);
  const skipAi = shouldSkipAiFeedback(category);

  // 视觉样式：根据 category 染色
  const categoryStyles: Record<string, string> = {
    qnumber: "border-accent/40 bg-accent-soft/10",
    allCorrect: "border-success/40 bg-success-soft/20",
    onlineCourse: "border-warning/30 bg-warning-soft/30",
    onlineReview: "border-warning/30 bg-warning-soft/30",
    onlineLast: "border-warning/30 bg-warning-soft/30",
    notSubmitted: "border-warning/40 bg-warning-soft/40",
    other: "border-warning/30 bg-warning-soft/20",
    blank: "border-hairline bg-white",
  };
  const rowStyle = categoryStyles[category] ?? "border-hairline bg-white";

  return (
    <tr
      className={`border-b border-hairline last:border-b-0 hover:bg-canvas-alt/20 transition border-l-4 ${rowStyle}`}
    >
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

      {/* C 列 · 错题（统一 input + 快捷按钮） */}
      <td className="px-3 py-2 align-top">
        <input
          type="text"
          value={student.qNumbersInput}
          onChange={(e) => onChange({ qNumbersInput: e.target.value })}
          placeholder="输入题号如 3，6 或选下方特殊值"
          className="w-full text-sm px-2 py-1 rounded border border-hairline bg-white focus:outline-none focus:ring-1 focus:ring-accent/40 font-mono"
        />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {QUICK_FILL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ qNumbersInput: opt.value })}
              className={`
                text-[10px] px-1.5 py-0.5 rounded transition
                ${
                  student.qNumbersInput === opt.value
                    ? "bg-warning-text text-white"
                    : "bg-canvas-alt text-ink-muted hover:bg-warning-soft hover:text-warning-text"
                }
              `}
              title={`填入 ${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </td>

      {/* D 列 · 反馈 */}
      <td className="px-3 py-2 align-top">
        <textarea
          value={student.feedback}
          onChange={(e) => onChange({ feedback: e.target.value })}
          placeholder={
            skipAi
              ? "（特殊情况，AI 跳过此行；最后手动合并单元格写小结）"
              : "Stage 3 AI 自动填入 / 你也可以手动写"
          }
          rows={2}
          className={`
            w-full text-xs px-2 py-1.5 rounded border bg-white focus:outline-none focus:ring-1 focus:ring-accent/40 resize-none
            ${skipAi ? "border-hairline text-ink-muted" : "border-hairline"}
          `}
        />
      </td>
    </tr>
  );
}