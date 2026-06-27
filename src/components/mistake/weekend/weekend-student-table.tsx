"use client";

/**
 * 周末错题反馈表 · 学生表视图（v0.4 · Stage 6 动态列版）
 * 来源：docs/stages/weekend-mistake-table-v0.md + 用户 2026-06-27 反馈
 *
 * v0.4 关键改动（Stage 6）：
 * - 表头 + 行渲染按 fieldColumns.qNumbersCols.length 动态切 1/2 列错题
 * - 列名优先用 R2 表头原文（"课后作业错题" / "堂测错题"），fallback 通用 "错题"
 * - 序号列在 serial=null 时不渲染
 * - 反馈列在 feedback=null 时不渲染（虽然实际场景几乎都有）
 *
 * v0.3 修订（Stage 4）：
 * - 姓名改成可编辑 input（之前是只读 div）
 * - 末尾"+ 添加学生"按钮追加横列（rowIndex 用 max+1）
 * - 每行末加"删除"按钮（可单独删除某行）
 *
 * 自动排序逻辑见 weekend-types.ts: sortStudentsByCellValue()
 */

import { useEffect, useState } from "react";
import {
  QUICK_FILL_OPTIONS,
  classifyCellValue,
  shouldSkipAiFeedback,
  WEEKEND_STUDENT_LIMIT,
  getQNumberLabels,
  type WeekendStudent,
  type FieldColumnMap,
} from "@/lib/mistake/weekend-types";
import { CloseIcon, AddIcon } from "@/components/icons";

export function WeekendStudentTable({
  students,
  fieldColumns,
  rawR2,
  onStudentChange,
  onAutoSort,
  onAddStudent,
  onDeleteStudent,
}: {
  students: WeekendStudent[];
  /** ⭐ Stage 6：R2 表头识别的列布局（决定 UI 渲染哪些列）*/
  fieldColumns: FieldColumnMap;
  /** ⭐ Stage 6.5：R2 表头原文（rows[1]）· 用于显示真实列名 */
  rawR2?: unknown[];
  onStudentChange: (rowIndex: number, patch: Partial<WeekendStudent>) => void;
  onAutoSort: () => { moved: number; total: number };
  onAddStudent: () => void;
  onDeleteStudent: (rowIndex: number) => void;
}) {
  const [sortFeedback, setSortFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!sortFeedback) return;
    const t = setTimeout(() => setSortFeedback(null), 2500);
    return () => clearTimeout(t);
  }, [sortFeedback]);

  // ⭐ Stage 6.5：错题列标签（用 R2 原文）
  const qLabels = getQNumberLabels(fieldColumns, rawR2);
  const qCount = fieldColumns.qNumbersCols.length;

  // 统计已填数量（用于显示在排序按钮旁边）
  const filledCount = students.filter(
    (s) =>
      s.qNumbersInput.trim() !== "" ||
      (s.qNumbersInput2?.trim() ?? "") !== "" ||
      s.feedback.trim() !== "",
  ).length;

  // 按 category 统计（用于预览"排序后会变怎样"）—— 只看第一个错题列
  const categoryCounts = students.reduce<Record<string, number>>((acc, s) => {
    const c = classifyCellValue(s.qNumbersInput);
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});
  const hasAnyFilled = students.some(
    (s) => classifyCellValue(s.qNumbersInput) !== "blank",
  );

  const atMax = students.length >= WEEKEND_STUDENT_LIMIT;
  const showSerial = fieldColumns.serial !== null;
  const showFeedback = fieldColumns.feedback !== null;

  // ⭐ 表格总列数（min-w 同步调整）
  const totalCols = (showSerial ? 1 : 0) + 1 + qCount + (showFeedback ? 1 : 0) + 1;

  return (
    <div className="space-y-3">
      {/* 顶部工具栏：分类预览 + 已填统计 + 自动排序按钮 */}
      <div className="flex items-center justify-between gap-3 px-1 flex-wrap">
        <div className="flex items-center gap-3 text-xs text-ink-muted flex-wrap">
          <span>
            共 {students.length} / {WEEKEND_STUDENT_LIMIT} 人 · 已填 {filledCount} 人
          </span>
          {hasAnyFilled && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-canvas-alt/60">
              <span className="text-[10px]">📊</span>
              <span>
                题号 {categoryCounts.qnumber ?? 0} · 全对{" "}
                {categoryCounts.allCorrect ?? 0} · 网课{" "}
                {(categoryCounts.onlineCourse ?? 0) +
                  (categoryCounts.onlineReview ?? 0) +
                  (categoryCounts.onlineLast ?? 0)}{" "}
                · 未交 {categoryCounts.notSubmitted ?? 0} · 留空{" "}
                {categoryCounts.blank ?? 0}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const { moved, total } = onAutoSort();
              if (moved === 0) {
                setSortFeedback(`已是排序顺序（${total} 人）`);
              } else {
                setSortFeedback(`✓ 已排序（移动 ${moved} / ${total} 人）`);
              }
            }}
            className={`
              inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition font-medium
              ${
                sortFeedback
                  ? "bg-success-soft text-success-text border border-success/40"
                  : "bg-accent-text text-white hover:bg-accent-hover shadow-sm"
              }
            `}
            title={`按 ${qLabels[0] ?? "错题"} 列自动排序：有题号(数字升序) → 全对 → 网课 → 作业未交 → 留空`}
          >
            <span>↕️</span>
            <span>{sortFeedback ?? "自动排序"}</span>
          </button>
        </div>
      </div>

      {/* 排序提示横幅（错题 1 列全空时） */}
      {!hasAnyFilled && (
        <div className="rounded-lg bg-warning-soft/40 border border-warning/30 px-3 py-2 text-xs text-ink-muted">
          💡 先在「{qLabels[0] ?? "错题"}」列填一些错题号（如"3，6"）或选特殊值按钮，点排序才有效果。当前列全留空 → 排序按姓名拼音升序（基本不会改变原顺序）。
        </div>
      )}

      <div className="rounded-xl border border-hairline overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-canvas-alt/50 border-b border-hairline">
                {showSerial && (
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted w-14">
                    序号
                  </th>
                )}
                <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted w-28">
                  姓名
                </th>
                {/* ⭐ Stage 6.5：错题列动态渲染 */}
                {qLabels.map((label, idx) => (
                  <th
                    key={`q-${idx}`}
                    className={`px-3 py-2.5 text-left text-xs font-medium text-ink-muted ${qCount >= 2 ? "min-w-[180px]" : "min-w-[260px]"}`}
                  >
                    {label}
                    <span className="ml-1 text-[10px] text-ink-subtle">
                      ({String.fromCharCode(64 + (fieldColumns.qNumbersCols[idx] ?? 0))} 列)
                    </span>
                  </th>
                ))}
                {showFeedback && (
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted min-w-[220px]">
                    反馈
                    {fieldColumns.feedback !== null && (
                      <span className="ml-1 text-[10px] text-ink-subtle">
                        ({String.fromCharCode(64 + fieldColumns.feedback)} 列 · Stage 3 AI 接入)
                      </span>
                    )}
                  </th>
                )}
                <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted w-14">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalCols}
                    className="px-3 py-8 text-center text-sm text-ink-muted"
                  >
                    这个 Sheet 没有学生数据 · 点上方"添加学生"或在 Excel 里准备好名单
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <WeekendStudentRow
                    key={student.rowIndex}
                    student={student}
                    qLabels={qLabels}
                    fieldColumns={fieldColumns}
                    onChange={(patch) =>
                      onStudentChange(student.rowIndex, patch)
                    }
                    onDelete={() => onDeleteStudent(student.rowIndex)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ⭐ Stage 7.1：底部追加学生按钮（新增后无需滚动，直接填信息） */}
      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <span className="text-xs text-ink-subtle">
          {atMax ? `已达 ${WEEKEND_STUDENT_LIMIT} 人上限` : `共 ${students.length} 人 · 末尾追加后可直接填写`}
        </span>
        <button
          type="button"
          onClick={onAddStudent}
          disabled={atMax}
          title={atMax ? `已达 ${WEEKEND_STUDENT_LIMIT} 人上限` : "在末尾追加一行学生"}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-accent-text text-white hover:bg-accent-hover shadow-sm transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <AddIcon className="w-3.5 h-3.5" />
          <span>添加学生</span>
        </button>
      </div>
    </div>
  );
}

function WeekendStudentRow({
  student,
  qLabels,
  fieldColumns,
  onChange,
  onDelete,
}: {
  student: WeekendStudent;
  qLabels: string[];
  fieldColumns: FieldColumnMap;
  onChange: (patch: Partial<WeekendStudent>) => void;
  onDelete: () => void;
}) {
  const category = classifyCellValue(student.qNumbersInput);
  const skipAi = shouldSkipAiFeedback(category);

  // 视觉样式：根据 category 染色（按第 1 个错题列分类）
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

  const showSerial = fieldColumns.serial !== null;
  const showFeedback = fieldColumns.feedback !== null;

  return (
    <tr
      className={`border-b border-hairline last:border-b-0 hover:bg-canvas-alt/20 transition border-l-4 ${rowStyle}`}
    >
      {/* 序号（serial=null 时不渲染） */}
      {showSerial && (
        <td className="px-3 py-2 align-top">
          <input
            type="text"
            value={student.serialNumber}
            onChange={(e) => onChange({ serialNumber: e.target.value })}
            placeholder="—"
            className="w-12 text-sm px-2 py-1 rounded border border-hairline bg-white focus:outline-none focus:ring-1 focus:ring-accent/40 text-center"
          />
        </td>
      )}

      {/* 姓名（可编辑） */}
      <td className="px-3 py-2 align-top">
        <input
          type="text"
          value={student.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="姓名"
          maxLength={20}
          className="w-full text-sm font-medium text-ink px-2 py-1 rounded border border-transparent bg-white hover:border-hairline focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent truncate"
        />
      </td>

      {/* ⭐ Stage 6.5：错题列动态渲染（1-N 列） */}
      {fieldColumns.qNumbersCols.map((col, idx) => {
        const isFirst = idx === 0;
        const value = isFirst
          ? student.qNumbersInput
          : student.qNumbersInput2 ?? "";
        const fieldKey = isFirst ? "qNumbersInput" : "qNumbersInput2";
        return (
          <td key={`qcell-${idx}`} className="px-3 py-2 align-top">
            <input
              type="text"
              value={value}
              onChange={(e) =>
                onChange({ [fieldKey]: e.target.value } as Partial<WeekendStudent>)
              }
              placeholder={`输入题号如 3，6 或选下方特殊值（${qLabels[idx] ?? ""}）`}
              className="w-full text-sm px-2 py-1 rounded border border-hairline bg-white focus:outline-none focus:ring-1 focus:ring-accent/40 font-mono"
            />
            {/* ⭐ 快捷按钮组只在第 1 列显示（避免重复） */}
            {isFirst && (
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
            )}
          </td>
        );
      })}

      {/* 反馈（feedback=null 时不渲染） */}
      {showFeedback && (
        <td className="px-3 py-2 align-top relative">
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
              w-full text-xs px-2 py-1.5 rounded border bg-white focus:outline-none focus:ring-1 focus:ring-accent/40 resize-none pr-7
              ${skipAi ? "border-hairline text-ink-muted" : "border-hairline"}
            `}
          />
          {/* ⭐ Stage 7.3：清空反馈按钮（只在有内容时显示） */}
          {student.feedback.trim() !== "" && (
            <button
              type="button"
              onClick={() => onChange({ feedback: "" })}
              title="清空此行反馈（可保留旧反馈作为参考）"
              aria-label="清空此行反馈"
              className="absolute top-1 right-1 w-5 h-5 rounded text-ink-subtle hover:bg-danger/10 hover:text-danger transition inline-flex items-center justify-center bg-white/80"
            >
              <CloseIcon className="w-3 h-3" />
            </button>
          )}
        </td>
      )}

      {/* ⭐ Stage 4：删除按钮 */}
      <td className="px-3 py-2 align-top">
        <button
          type="button"
          onClick={onDelete}
          title="删除此学生"
          aria-label={`删除 ${student.name || "此学生"}`}
          className="w-7 h-7 rounded text-ink-subtle hover:bg-danger/10 hover:text-danger transition inline-flex items-center justify-center"
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}