"use client";

/**
 * 周末错题反馈表 · 主容器（v0.2 简化版）
 * 来源：docs/stages/weekend-mistake-table-v0.md + 用户 2026-06-26 反馈
 *
 * v0.2 关键改动：
 * - 删除 status / statusNote 字段（用户原话："特殊情况不用单独列"）
 * - 删除 WEEKEND_STATUS_OPTIONS + StatusDropdown 引用
 * - 加 autoSort handler（调 sortStudentsByCellValue）
 * - 步骤指示器文案调整（v0.2 已完成 3/5）
 * - 状态机更新文案："C 列填错题（题号/特殊值）"
 *
 * 5 步骤状态机：
 *   upload → editDate → editStudents → aiFeedback (Stage 3) → export (Stage 2)
 *
 * v0.2 已实现：upload + editDate + editStudents
 * v0.2 待做：Stage 2（导出 Excel） + Stage 3（AI 反馈 batch API）
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import {
  parseWeekendWorkbook,
  readWeekendWorkbook,
  getThisWeekendDate,
} from "@/lib/mistake/weekend-parser";
import {
  loadWeekendDraft,
  saveWeekendDraft,
  clearWeekendDraft,
} from "@/lib/mistake/weekend-draft";
import {
  exportWeekendWorkbook,
  loadWeekendWorkbookForExport,
  suggestExportFileName,
} from "@/lib/mistake/weekend-exporter";
import {
  sortStudentsByCellValue,
  WEEKEND_STUDENT_LIMIT,
  type WeekendSheet,
  type WeekendStudent,
  type WeekendStep,
  type WeekendWorkbook,
} from "@/lib/mistake/weekend-types";
import {
  UploadIcon,
  CheckIcon,
  ExcelIcon,
  ArrowLeftIcon,
  ResetIcon,
  SortIcon,
  DownloadIcon,
  AddIcon,
  CloseIcon,
} from "@/components/icons";
import { WeekendSheetTabs } from "./weekend-sheet-tabs";
import { WeekendStudentTable } from "./weekend-student-table";
import { WeekendAiFeedbackPanel } from "./weekend-ai-feedback-panel";
import type { BatchStudentResult } from "./weekend-ai-feedback-panel";

export function WeekendMistakeWorkflow() {
  const [step, setStep] = useState<WeekendStep>("upload");
  const [workbook, setWorkbook] = useState<WeekendWorkbook | null>(null);
  const [rawWb, setRawWb] = useState<XLSX.WorkBook | null>(null);
  /** v0.2.2: 原 File 对象（导出时用 exceljs 重新加载以保留样式）*/
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [newDate, setNewDate] = useState<string>(""); // 用户改后的日期
  const [editingTitles, setEditingTitles] = useState<Record<string, string>>(
    {},
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ===== Step 1：上传 Excel =====
  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const { workbook: wb, fileHash } = await readWeekendWorkbook(file);
      const parsed = parseWeekendWorkbook(wb, file.name, fileHash);
      if (parsed.sheets.length === 0) {
        throw new Error("Excel 里没有有效 Sheet（每个 Sheet 至少要有表头 + 1 行学生）");
      }

      // 尝试恢复每个 Sheet 的草稿
      const restoredSheets = parsed.sheets.map((sheet) => {
        const draft = loadWeekendDraft(fileHash, sheet.sheetName);
        if (draft) {
          // 合并草稿：保留 draft 的 students（用户已编辑）+ updatedTitle + newDate
          return {
            ...sheet,
            students:
              draft.students.length === sheet.students.length
                ? draft.students
                : sheet.students.map((s) => {
                    const ds = draft.students.find((d) => d.name === s.name);
                    return ds
                      ? {
                          ...s,
                          qNumbersInput: ds.qNumbersInput,
                          feedback: ds.feedback,
                        }
                      : s;
                  }),
            updatedTitle: draft.updatedTitle || sheet.updatedTitle,
            newDate: draft.newDate || sheet.newDate,
          };
        }
        return sheet;
      });

      // 初始化用户可编辑的标题 + 日期
      const titles: Record<string, string> = {};
      restoredSheets.forEach((s) => {
        titles[s.sheetName] = s.updatedTitle;
      });
      setEditingTitles(titles);
      setNewDate(restoredSheets[0]?.newDate ?? getThisWeekendDate());

      setRawWb(wb);
      setUploadedFile(file); // v0.2.2: 保存原 File 用于导出时 exceljs 重新加载
      setWorkbook({
        ...parsed,
        sheets: restoredSheets,
      });
      setActiveSheetIdx(0);
      setStep("editDate");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "解析失败");
    } finally {
      setIsUploading(false);
    }
  }, []);

  // ===== 标题编辑 =====
  const updateSheetTitle = useCallback(
    (sheetName: string, title: string) => {
      setEditingTitles((prev) => ({ ...prev, [sheetName]: title }));
    },
    [],
  );

  // ===== 学生变更 =====
  const updateStudent = useCallback(
    (sheetName: string, rowIndex: number, patch: Partial<WeekendStudent>) => {
      setWorkbook((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sheets: prev.sheets.map((s) => {
            if (s.sheetName !== sheetName) return s;
            return {
              ...s,
              students: s.students.map((st) =>
                st.rowIndex === rowIndex ? { ...st, ...patch } : st,
              ),
            };
          }),
        };
      });
    },
    [],
  );

  // ===== ⭐ Stage 4：在 Sheet 末尾追加一名学生 =====
  const addStudent = useCallback(
    (sheetName: string) => {
      setWorkbook((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sheets: prev.sheets.map((s) => {
            if (s.sheetName !== sheetName) return s;
            if (s.students.length >= WEEKEND_STUDENT_LIMIT) return s; // 上限保护
            // 找当前最大 rowIndex + 1（用最大避免跟原始数据冲突，rowIndex 只是标识符）
            const maxRow = s.students.reduce(
              (max, st) => Math.max(max, st.rowIndex),
              0,
            );
            const nextSerial = String(s.students.length + 1);
            const newStudent: WeekendStudent = {
              rowIndex: maxRow + 1,
              serialNumber: nextSerial,
              name: "",
              qNumbersInput: "",
              feedback: "",
            };
            return { ...s, students: [...s.students, newStudent] };
          }),
        };
      });
    },
    [],
  );

  // ===== ⭐ Stage 4：删除指定学生 =====
  const deleteStudent = useCallback(
    (sheetName: string, rowIndex: number) => {
      setWorkbook((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sheets: prev.sheets.map((s) => {
            if (s.sheetName !== sheetName) return s;
            return {
              ...s,
              students: s.students.filter((st) => st.rowIndex !== rowIndex),
            };
          }),
        };
      });
    },
    [],
  );

  // ===== AI 反馈回填（Stage 3） =====
  const applyAiFeedback = useCallback(
    (sheetName: string, results: BatchStudentResult[]) => {
      setWorkbook((prev) => {
        if (!prev) return prev;
        // 构建 name → feedback 映射
        const feedbackMap = new Map<string, string>();
        for (const r of results) {
          feedbackMap.set(r.name, r.feedback);
        }
        return {
          ...prev,
          sheets: prev.sheets.map((s) => {
            if (s.sheetName !== sheetName) return s;
            return {
              ...s,
              students: s.students.map((st) => {
                const fb = feedbackMap.get(st.name);
                if (fb === undefined || fb === "") return st;
                return { ...st, feedback: fb };
              }),
            };
          }),
        };
      });
    },
    [],
  );

  // ===== ⭐ Stage 5.2：从 sourceSheet 复制结构，添加新 Sheet =====
  const addSheet = useCallback(
    (newName: string, sourceSheetName: string): { ok: boolean; error?: string; newIdx?: number } => {
      const trimmed = newName.trim();
      if (!trimmed) return { ok: false, error: "新 Sheet 名不能为空" };
      if (!workbook) return { ok: false, error: "Workbook 未初始化" };
      if (workbook.sheets.some((s) => s.sheetName === trimmed)) {
        return { ok: false, error: `Sheet 名「${trimmed}」已存在` };
      }
      const src = workbook.sheets.find((s) => s.sheetName === sourceSheetName);
      if (!src) {
        return { ok: false, error: `源 Sheet「${sourceSheetName}」不存在` };
      }
      // 复制 R1 (rawRows[0]) + R2 (rawRows[1])，students 清空
      const newRawRows: unknown[][] = src.rawRows.slice(0, 2).map((row) => [...row]);
      // 更新 R1 标题：用新 sheet 名 + 当前日期
      const today = getThisWeekendDate();
      const newTitle = `${trimmed}反馈表 ${today}`;
      if (newRawRows[0] && Array.isArray(newRawRows[0])) {
        // R1 是合并行（merged B1:E1），只保留 B 列位置作为标题
        newRawRows[0][1] = newTitle;
      }
      const newSheet: WeekendSheet = {
        sheetName: trimmed,
        originalTitle: newTitle,
        updatedTitle: newTitle,
        classroomHint: trimmed,
        detectedDate: null,
        newDate: today,
        students: [],
        rawRows: newRawRows,
        cols: src.cols,
        // ⭐ Stage 5.2：标记新加的 sheet（导出时 clone sourceSheet 样式）
        sourceSheetName: sourceSheetName,
        isNewSheet: true,
      };
      const newSheets = [...workbook.sheets, newSheet];
      setWorkbook({ ...workbook, sheets: newSheets });
      setEditingTitles((prev) => ({ ...prev, [trimmed]: newTitle }));
      const newIdx = newSheets.length - 1;
      setActiveSheetIdx(newIdx);
      return { ok: true, newIdx };
    },
    [workbook],
  );

  // ===== 自动排序（v0.2 新增 · v0.2.1 修订：返回 moved/total 用于 toast 反馈）=====
  const autoSortSheet = useCallback(
    (sheetName: string): { moved: number; total: number } => {
      let movedCount = 0;
      let totalCount = 0;
      setWorkbook((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sheets: prev.sheets.map((s) => {
            if (s.sheetName !== sheetName) return s;
            const sorted = sortStudentsByCellValue(s.students);
            // 计算实际移动人数（位置变了 = 算移动）
            totalCount = sorted.length;
            for (let i = 0; i < sorted.length; i++) {
              if (sorted[i].rowIndex !== s.students[i].rowIndex) {
                movedCount++;
              }
            }
            return { ...s, students: sorted };
          }),
        };
      });
      return { moved: movedCount, total: totalCount };
    },
    [],
  );

  // ===== 自动保存草稿（编辑学生时实时）=====
  useEffect(() => {
    if (!workbook) return;
    workbook.sheets.forEach((sheet) => {
      saveWeekendDraft({
        fileHash: workbook.fileHash,
        fileName: workbook.fileName,
        sheetName: sheet.sheetName,
        students: sheet.students,
        updatedTitle: editingTitles[sheet.sheetName] ?? sheet.updatedTitle,
        newDate: sheet.newDate,
        savedAt: Date.now(),
      });
    });
  }, [workbook, editingTitles]);

  // ===== 当前 Sheet =====
  const activeSheet: WeekendSheet | null = useMemo(() => {
    if (!workbook) return null;
    return workbook.sheets[activeSheetIdx] ?? null;
  }, [workbook, activeSheetIdx]);

  // ===== 步骤切换 =====
  const goToEditStudents = useCallback(() => {
    // 把 editingTitles 应用到 workbook.sheets
    setWorkbook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sheets: prev.sheets.map((s) => ({
          ...s,
          updatedTitle: editingTitles[s.sheetName] ?? s.updatedTitle,
        })),
      };
    });
    setStep("editStudents");
  }, [editingTitles]);

  const backToUpload = useCallback(() => {
    setWorkbook(null);
    setRawWb(null);
    setUploadedFile(null);
    setEditingTitles({});
    setActiveSheetIdx(0);
    setStep("upload");
  }, []);

  const backToEditDate = useCallback(() => {
    setStep("editDate");
  }, []);

  const resetAll = useCallback(() => {
    if (!workbook) return;
    if (
      !confirm(
        `确定重置整个工作簿？\n\n将清空：所有 Sheet 的学生编辑 + 草稿\n保留：上传的文件\n\n此操作不可撤销`,
      )
    )
      return;
    workbook.sheets.forEach((s) => {
      clearWeekendDraft(workbook.fileHash, s.sheetName);
    });
    backToUpload();
  }, [workbook, backToUpload]);

  return (
    <div className="space-y-6">
      {/* 顶部：标题 + 重置按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            周末错题反馈表（v0.2）
          </h2>
          <p className="text-xs text-ink-muted mt-1">
            上传周末 Excel → 改日期 → 填错题 + 自动排序 → AI 反馈 + 导出
          </p>
        </div>
        {workbook && (
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md text-ink-muted hover:text-danger hover:bg-canvas-alt transition"
          >
            <ResetIcon className="w-3.5 h-3.5" />
            重置全部
          </button>
        )}
      </div>

      {/* 步骤指示器 */}
      {workbook && <WeekendStepIndicator step={step} />}

      {/* Step 1：上传 */}
      {step === "upload" && (
        <WeekendUploadStep
          onUpload={handleUpload}
          isUploading={isUploading}
          error={uploadError}
        />
      )}

      {/* Step 2：改 R1 表头日期 */}
      {step === "editDate" && workbook && (
        <WeekendEditDateStep
          workbook={workbook}
          editingTitles={editingTitles}
          onTitleChange={updateSheetTitle}
          onConfirm={goToEditStudents}
          onBack={backToUpload}
          onAddSheet={addSheet}
        />
      )}

      {/* Step 3：编辑学生表 */}
      {step === "editStudents" && workbook && activeSheet && (
        <WeekendEditStudentsStep
          workbook={workbook}
          activeSheetIdx={activeSheetIdx}
          onSheetChange={setActiveSheetIdx}
          onStudentChange={updateStudent}
          onAutoSort={(sheetName) => autoSortSheet(sheetName)}
          onAddStudent={addStudent}
          onDeleteStudent={deleteStudent}
          onBack={backToEditDate}
          uploadedFile={uploadedFile}
          onApplyAiFeedback={applyAiFeedback}
        />
      )}
    </div>
  );
}

// ============== 子组件 ==============

function WeekendStepIndicator({ step }: { step: WeekendStep }) {
  const steps: Array<{ id: WeekendStep; label: string }> = [
    { id: "upload", label: "上传" },
    { id: "editDate", label: "改日期" },
    { id: "editStudents", label: "填错题" },
    { id: "aiFeedback", label: "AI 反馈" },
    { id: "export", label: "导出" },
  ];
  // v0.2 已完成 3/5，4-5 在 Stage 2/3
  const showSteps = steps.filter(
    (s) => s.id !== "aiFeedback" && s.id !== "export",
  );
  const activeIdxVisible = showSteps.findIndex((s) => s.id === step);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {showSteps.map((s, i) => {
        const isActive = i === activeIdxVisible;
        const isDone = i < activeIdxVisible;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition
                ${
                  isActive
                    ? "bg-accent text-white"
                    : isDone
                      ? "bg-success-soft text-success-text"
                      : "bg-canvas-alt text-ink-subtle"
                }
              `}
            >
              <span
                className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                  ${
                    isActive
                      ? "bg-white text-accent"
                      : isDone
                        ? "bg-success text-white"
                        : "bg-hairline text-ink-subtle"
                  }
                `}
              >
                {isDone ? <CheckIcon className="w-3 h-3" /> : i + 1}
              </span>
              {s.label}
            </div>
            {i < showSteps.length - 1 && (
              <div
                className={`w-6 h-px ${isDone ? "bg-success" : "bg-hairline"}`}
              />
            )}
          </div>
        );
      })}
      <span className="text-xs text-ink-muted ml-2">
        （AI 反馈 / 导出 在 Stage 2-3）
      </span>
    </div>
  );
}

function WeekendUploadStep({
  onUpload,
  isUploading,
  error,
}: {
  onUpload: (file: File) => void;
  isUploading: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-white p-8">
      <div className="flex flex-col items-center justify-center text-center py-8">
        <div className="w-16 h-16 rounded-2xl bg-accent-soft flex items-center justify-center mb-4">
          <ExcelIcon className="w-8 h-8 text-accent-text" />
        </div>
        <h3 className="text-base font-medium text-ink mb-2">
          上传错题反馈表 Excel
        </h3>
        <p className="text-xs text-ink-muted mb-6 max-w-md">
          1 个 Excel 可包含多个 Sheet（数学/物理/化学等）。
          系统会自动识别 R1 表头日期并改成今日，姓名自动提取，C 列（错题）你手动填。
        </p>

        <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-text text-white text-sm font-medium hover:bg-accent-hover transition cursor-pointer disabled:opacity-50">
          <UploadIcon className="w-4 h-4" />
          {isUploading ? "解析中..." : "选择 Excel 文件"}
          <input
            type="file"
            accept=".xlsx,.xls"
            disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
            className="hidden"
          />
        </label>

        {error && (
          <div className="mt-4 text-xs text-danger bg-danger-soft rounded-lg px-3 py-2">
            ⚠️ {error}
          </div>
        )}

        <div className="mt-8 text-xs text-ink-muted max-w-md">
          <div className="font-medium text-ink mb-1">表格格式参考：</div>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>R1：标题（如「2026超火1班数学反馈表 6月28日」）</li>
            <li>R2：序号 | 姓名 | 错题1 | 错题2 | 反馈</li>
            <li>R3+：学生数据（错题/反馈列默认空，你手动填）</li>
          </ul>
        </div>

        <div className="mt-6 w-full max-w-md border-t border-hairline pt-5">
          <div className="flex items-center gap-2">
            <DownloadIcon className="w-4 h-4 text-accent-text" />
            <span className="text-xs font-medium text-ink">没有模板？点此下载</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href="/templates/lekao-weekend-mistake-template.xlsx"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-text text-white text-xs font-medium rounded-md hover:bg-accent-hover transition"
            >
              <ExcelIcon className="w-3.5 h-3.5" />
              下载反馈表 Excel 模板
            </a>
          </div>
          <p className="mt-2 text-[10px] text-ink-subtle">
            模板含 3 个 Sheet（数学/物理/化学），R1 日期改今日后可直接用
          </p>
        </div>
      </div>
    </div>
  );
}

function WeekendEditDateStep({
  workbook,
  editingTitles,
  onTitleChange,
  onConfirm,
  onBack,
  onAddSheet,
}: {
  workbook: WeekendWorkbook;
  editingTitles: Record<string, string>;
  onTitleChange: (sheetName: string, title: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  onAddSheet: (newName: string, sourceSheetName: string) => { ok: boolean; error?: string; newIdx?: number };
}) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
  const [sourceSheetName, setSourceSheetName] = useState(
    workbook.sheets[0]?.sheetName ?? "",
  );
  const [addSheetError, setAddSheetError] = useState<string | null>(null);
  const today = getThisWeekendDate();
  return (
    <div className="rounded-2xl border border-hairline bg-white p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">改 R1 表头日期</h3>
          <p className="text-xs text-ink-muted mt-1">
            系统已自动把日期改成今日（{today}）。你也可以手动微调标题。
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          重新上传
        </button>
      </div>

      <div className="space-y-3">
        {workbook.sheets.map((sheet) => (
          <div
            key={sheet.sheetName}
            className="rounded-xl border border-hairline bg-canvas-alt/30 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <ExcelIcon className="w-4 h-4 text-accent-text" />
              <span className="text-sm font-medium text-ink">
                {sheet.sheetName}
              </span>
              {sheet.detectedDate && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-success-soft text-success-text">
                  ✓ 识别日期 {sheet.detectedDate}
                </span>
              )}
            </div>
            <input
              type="text"
              value={editingTitles[sheet.sheetName] ?? sheet.updatedTitle}
              onChange={(e) => onTitleChange(sheet.sheetName, e.target.value)}
              placeholder="R1 标题（含日期）"
              className="w-full rounded-lg border border-hairline px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <div className="mt-2 text-xs text-ink-muted">
              原标题：
              <span className="text-ink-subtle">{sheet.originalTitle}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-hairline">
        <button
          type="button"
          onClick={() => {
            setShowAddSheet(true);
            setAddSheetError(null);
            setNewSheetName("");
            setSourceSheetName(workbook.sheets[0]?.sheetName ?? "");
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-accent-text border border-accent-line hover:bg-accent-soft transition"
        >
          <AddIcon className="w-4 h-4" />
          添加新 Sheet
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-5 py-2.5 rounded-xl bg-accent-text text-white text-sm font-medium hover:bg-accent-hover transition"
        >
          下一步：填错题 →
        </button>
      </div>

      {/* ⭐ Stage 5.2 · 添加新 Sheet 弹窗 */}
      <AnimatePresence>
        {showAddSheet && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddSheet(false)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-ink">添加新 Sheet</h3>
                <button
                  type="button"
                  onClick={() => setShowAddSheet(false)}
                  className="p-1 rounded-md hover:bg-canvas-alt text-ink-muted"
                  aria-label="关闭"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-ink-muted">
                从现有 Sheet 复制 R1 标题格式 + R2 列头，students 留空。
                新 Sheet 默认标题为「{newSheetName.trim() || "新班名"}反馈表 {getThisWeekendDate()}」。
              </p>

              <div>
                <label className="text-xs font-medium text-ink mb-1 block">
                  新 Sheet 名（如「超火1班英语」）
                </label>
                <input
                  type="text"
                  value={newSheetName}
                  onChange={(e) => {
                    setNewSheetName(e.target.value);
                    setAddSheetError(null);
                  }}
                  placeholder="例：超火1班英语"
                  className="w-full rounded-lg border border-hairline px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-ink mb-1 block">
                  复制以下 Sheet 的结构
                </label>
                <select
                  value={sourceSheetName}
                  onChange={(e) => setSourceSheetName(e.target.value)}
                  className="w-full rounded-lg border border-hairline px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  {workbook.sheets.map((s) => (
                    <option key={s.sheetName} value={s.sheetName}>
                      {s.sheetName}
                    </option>
                  ))}
                </select>
              </div>

              {addSheetError && (
                <div className="text-xs text-danger bg-danger-soft rounded-lg px-3 py-2">
                  ⚠️ {addSheetError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSheet(false)}
                  className="px-4 py-2 rounded-lg text-sm text-ink-muted hover:bg-canvas-alt transition"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const result = onAddSheet(newSheetName, sourceSheetName);
                    if (result.ok) {
                      setShowAddSheet(false);
                    } else if (result.error) {
                      setAddSheetError(result.error);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-accent-text text-white text-sm font-medium hover:bg-accent-hover transition"
                >
                  添加
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WeekendEditStudentsStep({
  workbook,
  activeSheetIdx,
  onSheetChange,
  onStudentChange,
  onAutoSort,
  onAddStudent,
  onDeleteStudent,
  onBack,
  uploadedFile,
  onApplyAiFeedback,
}: {
  workbook: WeekendWorkbook;
  activeSheetIdx: number;
  onSheetChange: (idx: number) => void;
  onStudentChange: (
    sheetName: string,
    rowIndex: number,
    patch: Partial<WeekendStudent>,
  ) => void;
  onAutoSort: (sheetName: string) => { moved: number; total: number };
  onAddStudent: (sheetName: string) => void;
  onDeleteStudent: (sheetName: string, rowIndex: number) => void;
  onBack: () => void;
  uploadedFile: File | null;
  onApplyAiFeedback: (sheetName: string, results: BatchStudentResult[]) => void;
}) {
  const activeSheet = workbook.sheets[activeSheetIdx];
  const today = getThisWeekendDate();

  return (
    <div className="rounded-2xl border border-hairline bg-white p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">填错题（C 列）</h3>
          <p className="text-xs text-ink-muted mt-1">
            手动填题号（如"3，6"）或选下方特殊值按钮（"全对"/"网课"/"作业未交"等）。
            点 ↕️ 自动排序按 C 列自动分组。
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          改标题日期
        </button>
      </div>

      <WeekendSheetTabs
        sheets={workbook.sheets.map((s) => ({
          sheetName: s.sheetName,
          studentCount: s.students.length,
          filledCount: s.students.filter(
            (st) => st.qNumbersInput.trim() !== "" || st.feedback.trim() !== "",
          ).length,
        }))}
        activeIdx={activeSheetIdx}
        onChange={onSheetChange}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSheet.sheetName}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <WeekendStudentTable
            students={activeSheet.students}
            onStudentChange={(rowIndex, patch) =>
              onStudentChange(activeSheet.sheetName, rowIndex, patch)
            }
            onAutoSort={() => onAutoSort(activeSheet.sheetName)}
            onAddStudent={() => onAddStudent(activeSheet.sheetName)}
            onDeleteStudent={(rowIndex) =>
              onDeleteStudent(activeSheet.sheetName, rowIndex)
            }
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between items-center pt-3 border-t border-hairline text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <SortIcon className="w-3.5 h-3.5" />
          排序规则：有题号(数字升序) → 全对 → 网课 → 作业未交 → 留空
        </span>
        <span className="text-ink-subtle">AI 反馈 (Stage 3)</span>
      </div>

      {/* Stage 3 · AI 反馈生成 */}
      <div className="border-t border-hairline pt-2">
        <WeekendAiFeedbackPanel
          sheetName={activeSheet.sheetName}
          students={activeSheet.students.map((s) => ({
            name: s.name,
            qNumbersInput: s.qNumbersInput,
          }))}
          date={today}
          onFeedbackReady={(results) =>
            onApplyAiFeedback(activeSheet.sheetName, results)
          }
        />
      </div>

      {/* Stage 2 · 导出 Excel 工具栏 */}
      <WeekendExportBar workbook={workbook} uploadedFile={uploadedFile} />
    </div>
  );
}

// ============== Stage 2 · 导出工具栏 ==============

function WeekendExportBar({
  workbook,
  uploadedFile,
}: {
  workbook: WeekendWorkbook;
  uploadedFile: File | null;
}) {
  const today = getThisWeekendDate();
  const firstSheetName = workbook.sheets[0]?.sheetName ?? "反馈表";
  const defaultName = suggestExportFileName(firstSheetName, today);
  const [fileName, setFileName] = useState(defaultName);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    msg: string;
  } | null>(null);

  // 统计全部 Sheet 的已填数（用于显示"导出 X 名学生"）
  const totalStudents = workbook.sheets.reduce(
    (acc, s) => acc + s.students.length,
    0,
  );
  const filledStudents = workbook.sheets.reduce(
    (acc, s) =>
      acc +
      s.students.filter(
        (st) =>
          st.qNumbersInput.trim() !== "" || st.feedback.trim() !== "",
      ).length,
    0,
  );

  const handleExport = useCallback(async () => {
    if (!uploadedFile) {
      setExportResult({
        success: false,
        msg: "导出失败：原文件已丢失，请重新上传",
      });
      return;
    }
    if (!fileName.trim()) {
      alert("文件名不能为空");
      return;
    }
    setIsExporting(true);
    setExportResult(null);
    try {
      // v0.2.2: 用 exceljs 重新加载原 File（保留样式）
      const wb = await loadWeekendWorkbookForExport(uploadedFile);
      await exportWeekendWorkbook(wb, workbook.sheets, fileName);
      setExportResult({
        success: true,
        msg: `✓ 已下载 ${fileName}（${workbook.sheets.length} 个 Sheet · ${filledStudents}/${totalStudents} 人已填）`,
      });
    } catch (e) {
      setExportResult({
        success: false,
        msg: `导出失败：${e instanceof Error ? e.message : "未知错误"}`,
      });
    } finally {
      setIsExporting(false);
    }
  }, [uploadedFile, workbook.sheets, fileName, filledStudents, totalStudents]);

  return (
    <div className="rounded-xl border border-accent-line/60 bg-accent-soft/10 p-5 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-white text-xs font-semibold">
          Stage 2.1
        </span>
        <h4 className="text-sm font-semibold text-ink">导出 Excel（保留模板样式）</h4>
        <span className="text-xs text-ink-muted">
          · {workbook.sheets.length} 个 Sheet · {filledStudents}/{totalStudents} 人已填
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="block text-xs text-ink-muted mb-1">
            文件名（默认：{defaultName}）
          </label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="如：2026超火1班数学6.26【反馈表】.xlsx"
            className="w-full rounded-lg border border-hairline px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting || totalStudents === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-text text-white text-sm font-medium hover:bg-accent-hover transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <DownloadIcon className="w-4 h-4" />
          {isExporting ? "导出中..." : `导出 ${workbook.sheets.length} 个 Sheet`}
        </button>
      </div>

      <div className="text-xs text-ink-muted space-y-1">
        <div>
          💡 导出会<strong>保留原模板样式</strong>：浅蓝色表头 / 列宽 / 合并单元格 / 字体 / 对齐。
          只修改：R1 标题（含替换后的日期）+ 学生 A 序号 + C 错题 + D 反馈。
        </div>
        <div className="text-ink-subtle">
          技术细节：用 exceljs 重新加载原 File 改单元格 value（不是 aoa_to_sheet 重写），styles/cols/merges 完整保留。
        </div>
      </div>

      {exportResult && (
        <div
          role="status"
          className={`rounded-lg p-3 text-sm ${
            exportResult.success
              ? "bg-success-soft/30 text-success-text"
              : "bg-warning/10 text-warning"
          }`}
        >
          {exportResult.msg}
        </div>
      )}
    </div>
  );
}