"use client";

/**
 * 错题集主流程组件（核心）
 * 来源：STAGE spec §6.1 + PRD §3.5.5
 *
 * 状态机：
 *   upload → selectSheet → fillSlots → export
 *
 * 所有状态保存在 useState（client-only，不需要全局状态管理）
 * 图片存 IndexedDB（image-store.ts）
 * 轻数据存 LocalStorage（draft）
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type * as XLSX from "xlsx";
import {
  dedupQNumbers,
  summarizeCollection,
} from "@/lib/mistake/qnumber-dedup";
import {
  listSheets,
  parseSheet,
  type SheetMetadata,
} from "@/lib/mistake/excel-parser";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  slotKey,
} from "@/lib/mistake/image-store";
import { isFileSystemAccessSupported } from "@/lib/mistake/fs-access";
import type {
  MistakeCollection,
  MistakeStep,
  QNumberSlot,
} from "@/lib/mistake/types";
import { ExcelUploader } from "./excel-uploader";
import { SheetSelector } from "./sheet-selector";
import { QNumberSlot as QNumberSlotUI } from "./qnumber-slot";
import { ExportBar } from "./export-bar";
import { HtmlPreview } from "./html-preview";

export function MistakeWorkflow() {
  const [step, setStep] = useState<MistakeStep>("upload");
  const [fsSupported, setFsSupported] = useState(false);

  // 客户端检测 File System Access API 支持
  useEffect(() => {
    setFsSupported(isFileSystemAccessSupported());
  }, []);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheets, setSheets] = useState<SheetMetadata[]>([]);
  const [collection, setCollection] = useState<MistakeCollection | null>(null);

  // 槽位数据：key = `${qType}:${qNumber}`
  const [slots, setSlots] = useState<Record<string, QNumberSlot>>({});

  // 学生选择
  const [studentSelection, setStudentSelection] = useState<Set<string>>(
    () => new Set(),
  );

  // HTML 预览
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<string | null>(null);

  // ===== 步骤 1：上传 Excel =====
  const onWorkbookReady = useCallback((wb: XLSX.WorkBook) => {
    setWorkbook(wb);
    const meta = listSheets(wb);
    setSheets(meta);
    setStep("selectSheet");
  }, []);

  // ===== 步骤 2：选择 Sheet =====
  const onSelectSheet = useCallback(
    (sheetName: string) => {
      if (!workbook) return;

      try {
        const parsed = parseSheet(workbook, sheetName);
        setCollection(parsed);

        // 默认全选所有学生
        setStudentSelection(new Set(parsed.students.map((s) => s.name)));

        // 尝试恢复草稿
        const draft = loadDraft(parsed.sheetName + ":" + parsed.date);
        if (draft) {
          setSlots(draft.slots);
          if (draft.studentSelection.length > 0) {
            setStudentSelection(new Set(draft.studentSelection));
          }
        } else {
          setSlots({});
        }

        setStep("fillSlots");
      } catch (e) {
        alert(e instanceof Error ? e.message : "解析失败");
      }
    },
    [workbook],
  );

  // ===== 步骤 3：槽位变化（自动保存草稿）=====
  const handleSlotChange = useCallback(
    (newSlot: QNumberSlot) => {
      setSlots((prev) => {
        const next = { ...prev, [slotKey(newSlot.qType, newSlot.qNumber)]: newSlot };
        return next;
      });
    },
    [],
  );

  // 草稿自动保存
  useEffect(() => {
    if (!collection) return;
    saveDraft(collection.sheetName + ":" + collection.date, {
      sheetName: collection.sheetName,
      date: collection.date,
      slots,
      studentSelection: Array.from(studentSelection),
    });
  }, [collection, slots, studentSelection]);

  // ===== 计算数据 =====
  const summary = useMemo(
    () => (collection ? summarizeCollection(collection.students) : null),
    [collection],
  );

  const classroomDedup = useMemo(
    () => (collection ? dedupQNumbers(collection.students, "classroom") : []),
    [collection],
  );

  const homeworkDedup = useMemo(
    () => (collection ? dedupQNumbers(collection.students, "homework") : []),
    [collection],
  );

  // ===== 学生选择 =====
  const toggleStudent = useCallback((name: string) => {
    setStudentSelection((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const selectAllStudents = useCallback(() => {
    if (!collection) return;
    setStudentSelection(new Set(collection.students.map((s) => s.name)));
  }, [collection]);

  const deselectAllStudents = useCallback(() => {
    setStudentSelection(new Set());
  }, []);

  // ===== 重置 / 返回 =====
  const resetAll = useCallback(() => {
    if (collection) {
      clearDraft(collection.sheetName + ":" + collection.date);
    }
    setCollection(null);
    setWorkbook(null);
    setSheets([]);
    setSlots({});
    setStudentSelection(new Set());
    setStep("upload");
  }, [collection]);

  const backToSheetSelect = useCallback(() => {
    setCollection(null);
    setSlots({});
    setStep("selectSheet");
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      {/* 顶部：标题 + 返回 */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 text-sm text-ink-subtle">错题集生成</div>
          <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
            班级错题 → Word 文档
          </h1>
          <p className="text-ink-muted mt-2 text-sm">
            上传 Excel 错题表 → 选择学科 → 填题号图片/文字 → 导出本地 Word
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-ink-muted hover:text-ink transition whitespace-nowrap"
        >
          ← 返回工作台
        </Link>
      </div>

      {/* 进度指示器 */}
      <StepIndicator step={step} />

      {/* Step 内容 */}
      <div className="mt-8">
        {step === "upload" && (
          <Section title="Step 1 · 上传 Excel 课堂反馈表">
            <ExcelUploader onWorkbookReady={onWorkbookReady} />
            <TemplateHint />
          </Section>
        )}

        {step === "selectSheet" && (
          <Section
            title={`Step 2 · 检测到 ${sheets.length} 个 Sheet，请选择 1 个学科`}
            action={
              <button
                type="button"
                onClick={resetAll}
                className="text-sm text-ink-muted hover:text-ink transition"
              >
                重新上传
              </button>
            }
          >
            <SheetSelector
              sheets={sheets}
              selectedSheet={null}
              onSelect={onSelectSheet}
            />
          </Section>
        )}

        {step === "fillSlots" && collection && summary && (
          <>
            <Section
              title={`Step 3 · ${collection.classroomName} · ${collection.date} · 全班 ${summary.totalStudents} 人`}
              action={
                <button
                  type="button"
                  onClick={backToSheetSelect}
                  className="text-sm text-ink-muted hover:text-ink transition"
                >
                  ← 重新选 Sheet
                </button>
              }
            >
              {/* 摘要卡 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <SummaryCard label="全班人数" value={summary.totalStudents} />
                <SummaryCard label="全对人数" value={summary.allCorrectCount} accent="success" />
                <SummaryCard label="堂测错题" value={summary.classroomQCount} accent="accent" />
                <SummaryCard label="作业错题" value={summary.homeworkQCount} accent="accent" />
              </div>

              {/* 两列：堂测 + 作业 */}
              <div className="grid lg:grid-cols-2 gap-6">
                <SlotColumn
                  title="堂测错题"
                  qType="classroom"
                  items={classroomDedup}
                  slots={slots}
                  onSlotChange={handleSlotChange}
                />
                <SlotColumn
                  title="作业错题"
                  qType="homework"
                  items={homeworkDedup}
                  slots={slots}
                  onSlotChange={handleSlotChange}
                />
              </div>
            </Section>

            {/* Step 4：学生选择 + 导出 */}
            <div className="mt-8">
              <Section
                title="Step 4 · 选择学生 + 导出 Word"
                action={
                  <span className="text-xs text-ink-muted">
                    已选 {studentSelection.size} / {collection.students.length} 人
                  </span>
                }
              >
                <div className="space-y-4">
                  {/* 学生列表 */}
                  <div className="rounded-xl border border-hairline bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-ink">
                        学生列表
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllStudents}
                          className="text-xs px-3 py-1 rounded-md bg-canvas-alt hover:bg-accent-soft hover:text-accent-ink transition"
                        >
                          全选
                        </button>
                        <button
                          type="button"
                          onClick={deselectAllStudents}
                          className="text-xs px-3 py-1 rounded-md bg-canvas-alt hover:bg-accent-soft hover:text-accent-ink transition"
                        >
                          全不选
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {collection.students.map((s) => (
                        <label
                          key={s.name}
                          className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-canvas-alt cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={studentSelection.has(s.name)}
                            onChange={() => toggleStudent(s.name)}
                            className="w-4 h-4 accent-accent"
                          />
                          <span className="truncate">{s.name}</span>
                          {s.isAllCorrect && (
                            <span className="ml-auto text-xs text-success-text">
                              ✓
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 导出栏 */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        // 默认预览第一个选中的学生
                        const first =
                          Array.from(studentSelection)[0] ||
                          collection.students[0]?.name;
                        if (first) {
                          setPreviewStudent(first);
                          setPreviewOpen(true);
                        }
                      }}
                      disabled={studentSelection.size === 0}
                      className="text-sm px-4 py-2 rounded-md bg-canvas-alt text-ink-mute hover:bg-accent-soft hover:text-accent-ink transition disabled:opacity-50"
                    >
                      👁 预览 Word 效果
                    </button>
                  </div>
                  <ExportBar
                    collection={collection}
                    classroomSlots={Object.values(slots).filter(
                      (s) => s.qType === "classroom",
                    )}
                    homeworkSlots={Object.values(slots).filter(
                      (s) => s.qType === "homework",
                    )}
                    studentNames={Array.from(studentSelection)}
                    isFsAccessSupported={fsSupported}
                  />
                </div>
              </Section>
            </div>
          </>
        )}
      </div>

      {/* HTML 预览模态框 */}
      {previewStudent && (
        <HtmlPreview
          collection={collection!}
          classroomSlots={Object.values(slots).filter(
            (s) => s.qType === "classroom",
          )}
          homeworkSlots={Object.values(slots).filter(
            (s) => s.qType === "homework",
          )}
          studentName={previewStudent}
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

// ============== 子组件 ==============

function StepIndicator({ step }: { step: MistakeStep }) {
  const steps = [
    { id: "upload" as const, label: "上传" },
    { id: "selectSheet" as const, label: "选学科" },
    { id: "fillSlots" as const, label: "填题号" },
    { id: "export" as const, label: "导出" },
  ];

  const activeIdx = steps.findIndex((s) => s.id === step);

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const isActive = i === activeIdx;
        const isDone = i < activeIdx;
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
                {isDone ? "✓" : i + 1}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-6 h-px ${isDone ? "bg-success" : "bg-hairline"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-white p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "accent" | "success";
}) {
  const colors =
    accent === "success"
      ? "bg-success-soft text-success-text"
      : accent === "accent"
      ? "bg-accent-soft text-accent-ink"
      : "bg-canvas-alt text-ink";

  return (
    <div className={`rounded-xl p-4 ${colors}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function SlotColumn({
  title,
  qType,
  items,
  slots,
  onSlotChange,
}: {
  title: string;
  qType: "classroom" | "homework";
  items: import("@/lib/mistake/types").DedupedQNumber[];
  slots: Record<string, QNumberSlot>;
  onSlotChange: (slot: QNumberSlot) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-ink">{title}</h3>
        <span className="text-xs text-ink-muted">
          {items.length} 道
        </span>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-hairline bg-canvas-alt/30 p-8 text-center text-sm text-ink-muted">
            没有错题（全班全对）
          </div>
        ) : (
          items.map((item) => {
            const key = slotKey(qType, item.qNumber);
            const initial = slots[key];
            return (
              <QNumberSlotUI
                key={key}
                qNumber={item.qNumber}
                qType={qType}
                errorCount={item.errorCount}
                initialSlot={initial}
                onChange={onSlotChange}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function TemplateHint() {
  return (
    <div className="mt-6 rounded-xl border border-accent-line bg-accent-soft/30 p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl shadow-sm shrink-0">
          📥
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-accent-ink text-sm">
            没有反馈表 / 想直接手写？
          </div>
          <div className="text-xs text-ink-muted mt-1">
            Excel 列名包含「姓名」「堂测错题」「作业错题」即可自动识别（模糊匹配）
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="/templates/lekao-mistake-template-v1.xlsx"
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-text text-white text-xs font-medium rounded-md hover:bg-accent-hover transition"
        >
          📊 下载 Excel 录入模板
        </a>
        <a
          href="/templates/lekao-mistake-word-template-v1.docx"
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-accent-line text-accent-ink text-xs font-medium rounded-md hover:bg-accent-soft transition"
        >
          📝 下载 Word 错题集模板
        </a>
      </div>
    </div>
  );
}