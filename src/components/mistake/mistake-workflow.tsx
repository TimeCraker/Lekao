"use client";

/**
 * 错题集主流程组件（核心）
 * 来源：STAGE spec §6.1 + PRD §3.5.5
 *
 * 状态机（v2 升级）：
 *   upload → selectSheet → confirmCover → fillSlots → export
 *
 * 所有状态保存在 useState（client-only，不需要全局状态管理）
 * 图片存 IndexedDB（image-store.ts）
 * 轻数据存 LocalStorage（draft）
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import type * as XLSX from "xlsx";
import {
  dedupQNumbers,
  summarizeCollection,
} from "@/lib/mistake/qnumber-dedup";
import {
  listSheets,
  parseSheet,
  scanHeaders,
  type SheetMetadata,
  type HeaderScanResult,
} from "@/lib/mistake/excel-parser";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  slotKey,
  deleteImages,
} from "@/lib/mistake/image-store";
import { isFileSystemAccessSupported } from "@/lib/mistake/fs-access";
import type {
  MistakeCollection,
  MistakeStep,
  QNumberSlot,
} from "@/lib/mistake/types";
import { getImageIds } from "@/lib/mistake/types";
import {
  CheckIcon,
  EyeIcon,
  WordIcon,
  ExcelIcon,
  DownloadIcon,
  LightbulbIcon,
  ArrowLeftIcon,
  TrashIcon,
} from "@/components/icons";
import { ExcelUploader } from "./excel-uploader";
import { SheetSelector } from "./sheet-selector";
import { ConfirmCover, type ConfirmCoverValue } from "./confirm-cover";
import { QNumberSlot as QNumberSlotUI } from "./qnumber-slot";
import { ExportBar } from "./export-bar";
import { HtmlPreview } from "./html-preview";
import { HistoryDatePanel } from "./history-date-panel";

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

  // v3 新增：表头扫描结果（columnMapper 步骤使用）
  const [headerScan, setHeaderScan] = useState<HeaderScanResult | null>(null);

  // v2 新增：封面信息 override（用户可改，预筛选默认 = Excel 提取）
  const [coverOverride, setCoverOverride] = useState<ConfirmCoverValue | null>(
    null,
  );

  // v3 新增：日期 override（Excel 未识别或需要改时）
  const [dateOverride, setDateOverride] = useState<string>("");

  // v4 新增：日期是否被用户主动确认过（用于显示 ⚠️ 提示）
  const [dateConfirmed, setDateConfirmed] = useState<boolean>(false);

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

  // ===== 步骤 2：选择 Sheet → 解析 + 进 confirmCover（同时记录表头供 fillSlots 映射用）=====
  const onSelectSheet = useCallback(
    (sheetName: string) => {
      if (!workbook) return;

      try {
        // 记录表头扫描结果（fillSlots 页面列映射面板使用）
        const scan = scanHeaders(workbook, sheetName);
        setHeaderScan(scan);

        // 正式解析（用自动检测的列映射）
        const parsed = parseSheet(workbook, sheetName);
        setCollection(parsed);

        // v2：先初始化 cover override（用户可改）
        setCoverOverride({
          subjectName: parsed.sheetName,
          classroomName: parsed.classroomName || parsed.sheetName,
        });

        // v3：初始化日期 override
        setDateOverride(parsed.date);

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

        setStep("confirmCover");
      } catch (e) {
        alert(e instanceof Error ? e.message : "解析失败");
      }
    },
    [workbook],
  );

  // ===== 步骤 2.5：确认封面 → 进 fillSlots =====
  const onConfirmCover = useCallback(() => {
    setStep("fillSlots");
  }, []);

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

  // v2：把 cover override 合并到 collection（用于 export 时的封面 + 页眉）
  // v3：同时合并日期 override
  const finalCollection = useMemo<MistakeCollection | null>(() => {
    if (!collection) return null;
    if (!coverOverride && !dateOverride) return collection;
    return {
      ...collection,
      sheetName: coverOverride?.subjectName || collection.sheetName,
      classroomName:
        coverOverride?.classroomName || collection.classroomName,
      date: dateOverride || collection.date,
    };
  }, [collection, coverOverride, dateOverride]);

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
    setCoverOverride(null);
    setHeaderScan(null);
    setDateOverride("");
    setDateConfirmed(false);
    setStep("upload");
  }, [collection]);

  const backToSheetSelect = useCallback(() => {
    setCollection(null);
    setSlots({});
    setCoverOverride(null);
    setHeaderScan(null);
    setDateOverride("");
    setDateConfirmed(false);
    setStep("selectSheet");
  }, []);

  const backToConfirmCover = useCallback(() => {
    setDateConfirmed(false);
    setStep("confirmCover");
  }, []);

  // v4 新增：一键清空所有槽位（保留题号聚合）
  // 修复（v4.2）：遍历所有 key 显式置空字段（不删 key！），让 QNumberSlot 子组件
  // 通过 initialSlot 引用变化触发 useEffect 同步清空 textarea + 图片。
  // 旧版用 setSlots({}) 删 key → 子组件 initialSlot=undefined 不一定触发同步。
  const clearAllSlots = useCallback(() => {
    if (!confirm(
      "确定清空所有已填槽位？\n\n" +
      "将清空：图片 + 文字 + 全对标记\n" +
      "保留：题号聚合\n\n" +
      "此操作不可撤销",
    )) return;
    if (!collection) return;

    // 1) 收集所有图片 id 一次性从 IndexedDB 删掉（避免累积孤儿 Blob）
    const allImageIds: string[] = [];
    for (const slot of Object.values(slots)) {
      allImageIds.push(...getImageIds(slot));
    }
    if (allImageIds.length) {
      void deleteImages(allImageIds);
    }

    // 2) 清掉草稿
    clearDraft(collection.sheetName + ":" + collection.date);

    // 3) 关键：遍历所有 key 显式置空字段（保留 key，让子组件 useEffect 同步）
    const emptied: Record<string, QNumberSlot> = {};
    for (const [key, slot] of Object.entries(slots)) {
      emptied[key] = {
        qType: slot.qType,
        qNumber: slot.qNumber,
        textContent: "",
        isMarkedAllCorrect: false,
        imageBlobId: "",
        imageBlobIds: [],
        imagePreviewUrls: [],
      };
    }
    setSlots(emptied);

    // 4) 重置学生全选
    setStudentSelection(new Set(collection.students.map((s) => s.name)));
  }, [collection, slots]);

  // ===== v3 新增：fillSlots 页面重新映射列（用户手动改列对应）=====
  const [showMapping, setShowMapping] = useState(false);

  const reparseMapping = useCallback(
    (classroomCol: number, homeworkCol: number) => {
      if (!workbook || !collection) return;
      try {
        const remapped = parseSheet(workbook, collection.sheetName, {
          nameCol: collection.columns.nameCol,
          classroomCol,
          homeworkCol,
        });
        setCollection(remapped);
        // 列变化 → 题号变化 → 清空已填的槽位
        setSlots({});
        setStudentSelection(new Set(remapped.students.map((s) => s.name)));
        setShowMapping(false);
      } catch (e) {
        alert(e instanceof Error ? e.message : "重新解析失败");
      }
    },
    [workbook, collection],
  );

  return (
    <div className="px-6 md:px-10 py-8 max-w-6xl">
      {/* 顶部：返回链接（页面标题已交给 TopBar） */}
      <div className="mb-6 flex items-center justify-end">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition whitespace-nowrap"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          返回控制台
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

        {step === "confirmCover" && collection && workbook && coverOverride && (
          <Section
            title="Step 2.5 · 确认 Word 封面信息（学科 + 班级）"
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
            <ConfirmCover
              collection={collection}
              workbook={workbook}
              value={coverOverride}
              onChange={setCoverOverride}
              onConfirm={onConfirmCover}
              onBack={backToSheetSelect}
            />
          </Section>
        )}

        {step === "fillSlots" && collection && summary && (
          <>
            <Section
              title={
                <span className="flex items-center gap-2 flex-wrap">
                  <span>Step 3 · {finalCollection?.classroomName ?? collection.classroomName}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs text-ink-muted">日期</span>
                    <input
                      type="date"
                      value={dateOverride}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        if (newDate !== dateOverride && newDate !== "" && collection) {
                          // 日期变化 → 清空 slots + 草稿 + 重置学生选择
                          clearDraft(collection.sheetName + ":" + collection.date);
                          setSlots({});
                          setStudentSelection(
                            new Set(collection.students.map((s) => s.name)),
                          );
                        }
                        setDateConfirmed(newDate !== (collection?.date ?? ""));
                        setDateOverride(newDate);
                      }}
                      className="text-sm px-2.5 py-1 rounded-md border-2 border-warning bg-white w-40 focus:outline-none focus:ring-2 focus:ring-warning/50"
                    />
                    {dateConfirmed ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success-text">
                        <CheckIcon className="w-3 h-3" />
                        已确认
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-warning-soft text-warning-text border border-warning/30">
                        ⚠️ 请确认日期
                      </span>
                    )}
                  </span>
                  <span>· 全班 {summary.totalStudents} 人</span>
                </span>
              }
              action={
                <button
                  type="button"
                  onClick={backToConfirmCover}
                  className="text-sm text-ink-muted hover:text-ink transition"
                >
                  ← 改封面信息
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

              {/* v3 新增：列映射调整面板 */}
              {headerScan && (
                <MappingPanel
                  showMapping={showMapping}
                  setShowMapping={setShowMapping}
                  headers={headerScan.headers}
                  currentClassroomCol={collection.columns.classroomCol}
                  currentHomeworkCol={collection.columns.homeworkCol}
                  nameColName={headerScan.headers[collection.columns.nameCol] ?? "未识别"}
                  onApply={reparseMapping}
                />
              )}

              {/* v4 新增：清空所有槽位按钮（一键重置填图/文字/全对标记，保留题号聚合） */}
              <div className="flex justify-end -mt-2 mb-2">
                <button
                  type="button"
                  onClick={clearAllSlots}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-md text-ink-muted hover:text-danger hover:bg-canvas-alt transition"
                  title="清空所有已填的题号图片+文字+全对标记，题号聚合保留"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  清空所有槽位
                </button>
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

            {/* v2 新增：Step 4 顶部历史日期面板（管理该学科所有日期） */}
            <div className="mt-6">
              <HistoryDatePanel
                sheetName={collection.sheetName}
                onChange={() => {
                  // 删除/重做后不需要强制刷新 workflow（panel 内部已 reload）
                }}
              />
            </div>

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
                            <CheckIcon className="ml-auto w-3.5 h-3.5 text-success-text" />
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
                      className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-md bg-canvas-alt text-ink-mute hover:bg-accent-soft hover:text-accent-ink transition disabled:opacity-50"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      预览 Word 效果
                    </button>
                  </div>
                  {finalCollection && (
                    <ExportBar
                      collection={finalCollection}
                      classroomSlots={Object.values(slots).filter(
                        (s) => s.qType === "classroom",
                      )}
                      homeworkSlots={Object.values(slots).filter(
                        (s) => s.qType === "homework",
                      )}
                      studentNames={Array.from(studentSelection)}
                      isFsAccessSupported={fsSupported}
                    />
                  )}
                </div>
              </Section>
            </div>
          </>
        )}
      </div>

      {/* HTML 预览模态框 */}
      {previewStudent && finalCollection && (
        <HtmlPreview
          collection={finalCollection}
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
  const steps: Array<{ id: MistakeStep; label: string }> = [
    { id: "upload", label: "上传" },
    { id: "selectSheet", label: "选学科" },
    { id: "confirmCover", label: "封面" },
    { id: "fillSlots", label: "填题号" },
    { id: "export", label: "导出" },
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
                {isDone ? <CheckIcon className="w-3 h-3" /> : i + 1}
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
  title: React.ReactNode;
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
          <AnimatePresence initial={false}>
            {items.map((item, idx) => {
              const key = slotKey(qType, item.qNumber);
              const initial = slots[key];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -30, scale: 0.96 }}
                  transition={{
                    duration: 0.35,
                    delay: idx * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <QNumberSlotUI
                    qNumber={item.qNumber}
                    qType={qType}
                    errorCount={item.errorCount}
                    initialSlot={initial}
                    onChange={onSlotChange}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

/**
 * v3 新增：fillSlots 页面内的列映射调整面板
 * 展开后显示堂测/作业两列的下拉选择器，应用后重新解析
 */
function MappingPanel({
  showMapping,
  setShowMapping,
  headers,
  currentClassroomCol,
  currentHomeworkCol,
  nameColName,
  onApply,
}: {
  showMapping: boolean;
  setShowMapping: (v: boolean) => void;
  headers: string[];
  currentClassroomCol: number;
  currentHomeworkCol: number;
  nameColName: string;
  onApply: (classroomCol: number, homeworkCol: number) => void;
}) {
  const [classroomDraft, setClassroomDraft] = useState(currentClassroomCol);
  const [homeworkDraft, setHomeworkDraft] = useState(currentHomeworkCol);

  return (
    <div className="mb-6 rounded-xl border border-accent-line bg-accent-soft/20 p-4">
      <button
        type="button"
        onClick={() => setShowMapping(!showMapping)}
        className="flex items-center gap-2 text-sm font-medium text-accent-ink"
      >
        <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent-text">
          {showMapping ? "收起" : "展开"}
        </span>
        列映射调整
        <span className="text-xs text-ink-muted font-normal">
          （当前：堂测={headers[currentClassroomCol] ?? "未识别"} · 作业={headers[currentHomeworkCol] ?? "未识别"}）
        </span>
      </button>

      {showMapping && (
        <div className="mt-4 space-y-3">
          {/* 姓名列（只读） */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink w-28 shrink-0">姓名列</span>
            <span className="text-sm text-ink-muted">{nameColName}</span>
            <span className="text-xs text-success-text">（自动检测，不可改）</span>
          </div>

          {/* 堂测列 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink w-28 shrink-0">堂测错题列</span>
            <select
              value={classroomDraft}
              onChange={(e) => setClassroomDraft(Number(e.target.value))}
              className="flex-1 rounded-lg border border-hairline px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value={-1}>（不识别）</option>
              {headers.map((h, i) => (
                <option key={i} value={i}>{h || `列${i + 1}`}</option>
              ))}
            </select>
            {classroomDraft >= 0 && (
              <span className="text-xs text-ink-muted shrink-0">列{classroomDraft + 1}</span>
            )}
          </div>

          {/* 作业列 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink w-28 shrink-0">作业错题列</span>
            <select
              value={homeworkDraft}
              onChange={(e) => setHomeworkDraft(Number(e.target.value))}
              className="flex-1 rounded-lg border border-hairline px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value={-1}>（不识别）</option>
              {headers.map((h, i) => (
                <option key={i} value={i}>{h || `列${i + 1}`}</option>
              ))}
            </select>
            {homeworkDraft >= 0 && (
              <span className="text-xs text-ink-muted shrink-0">列{homeworkDraft + 1}</span>
            )}
          </div>

          <div className="text-xs text-ink-muted mt-2">
            ⚠️ 更改列映射会清空已填写的题号槽位
          </div>

          <div className="flex justify-end gap-3 mt-3">
            <button
              type="button"
              onClick={() => setShowMapping(false)}
              className="text-sm px-3 py-1.5 rounded-lg border border-hairline text-ink-muted hover:text-ink"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => onApply(classroomDraft, homeworkDraft)}
              disabled={classroomDraft === currentClassroomCol && homeworkDraft === currentHomeworkCol}
              className="text-sm px-4 py-1.5 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              应用映射
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateHint() {
  return (
    <div className="mt-6 rounded-xl border border-accent-line bg-accent-soft/30 p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
          <LightbulbIcon className="w-5 h-5 text-accent-text" />
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
          <ExcelIcon className="w-3.5 h-3.5" />
          下载 Excel 录入模板
        </a>
        <a
          href="/templates/lekao-mistake-word-template-v1.docx"
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-accent-line text-accent-ink text-xs font-medium rounded-md hover:bg-accent-soft transition"
        >
          <WordIcon className="w-3.5 h-3.5" />
          下载 Word 错题集模板
        </a>
      </div>
    </div>
  );
}