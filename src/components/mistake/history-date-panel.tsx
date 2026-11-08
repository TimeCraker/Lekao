"use client";

/**
 * Step 4 历史日期面板（v2 新增 · 阶段 2）
 *
 * 功能：
 * - 加载当前学科的所有历史 sections（loadAllSections）
 * - 按日期分组（聚合堂测题数 + 作业题数 + 学生数）
 * - 每条行支持：👁 预览（题号列表）/ 🗑 删除（confirm + deleteSectionByDate + deleteImages）/ 🔄 重做（跳 mistake）
 * - 默认收起（<details> 元素）
 * - 不显示具体内容（题号+文字），只显示日期+数量 chip（按用户决策）
 */

import { useCallback, useEffect, useState } from "react";
import {
  loadAllSections,
  deleteSectionByDate,
  type SavedSection,
} from "@/lib/mistake/section-store";
import { deleteImages } from "@/lib/mistake/image-store";
import { useDialogA11y } from "@/lib/hooks/dialog-a11y";
import {
  EyeIcon,
  TrashIcon,
  RefreshIcon,
  HistoryIcon,
  ImageIcon,
} from "@/components/icons";

export interface HistoryDatePanelProps {
  sheetName: string;
  onChange?: () => void; // 删除/重做后通知父组件刷新
}

interface DateAggregate {
  date: string;
  studentCount: number;
  classroomQCount: number;
  homeworkQCount: number;
  imageCount: number;
}

export function HistoryDatePanel({
  sheetName,
  onChange,
}: HistoryDatePanelProps) {
  const [dates, setDates] = useState<DateAggregate[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState<{
    date: string;
    sections: SavedSection[];
  } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const all = await loadAllSections({ sheetName });
      // 按日期分组聚合
      const map = new Map<string, DateAggregate>();
      for (const sec of all) {
        const cur = map.get(sec.date) ?? {
          date: sec.date,
          studentCount: 0,
          classroomQCount: 0,
          homeworkQCount: 0,
          imageCount: 0,
        };
        cur.studentCount += 1;
        cur.classroomQCount += sec.classroomQNumbers?.length ?? 0;
        cur.homeworkQCount += sec.homeworkQNumbers?.length ?? 0;
        cur.imageCount += sec.imageIds?.length ?? 0;
        map.set(sec.date, cur);
      }
      const arr = Array.from(map.values()).sort((a, b) =>
        b.date.localeCompare(a.date),
      );
      setDates(arr);
    } finally {
      setLoading(false);
    }
  }, [sheetName]);

  // reload 首行即 setLoading(true)：用 0ms 调度把它移出 effect 同步路径，
  // 避免 effect 内同步 setState 触发级联渲染（react-hooks/set-state-in-effect）
  useEffect(() => {
    if (!sheetName) return;
    const t = setTimeout(reload, 0);
    return () => clearTimeout(t);
  }, [sheetName, reload]);

  // 👁 预览：加载该日期所有 sections，弹 modal
  const handlePreview = useCallback(
    async (date: string) => {
      const sections = await loadAllSections({ sheetName, date });
      setPreviewing({ date, sections });
    },
    [sheetName],
  );

  // 🗑 删除：confirm + deleteSectionByDate + deleteImages
  const handleDelete = useCallback(
    async (date: string, imageCount: number) => {
      if (
        !confirm(
          `删除 ${date} 的所有学生数据？\n\n` +
            `会删掉 ${dates.find((d) => d.date === date)?.studentCount ?? 0} 个学生的数据` +
            (imageCount > 0 ? ` 和 ${imageCount} 张图片` : "") +
            "。\n\n此操作不可撤销",
        )
      )
        return;
      const sections = await loadAllSections({ sheetName, date });
      const allImageIds = sections.flatMap((s) => s.imageIds ?? []);
      await Promise.all([
        deleteImages(allImageIds),
        deleteSectionByDate(sheetName, date),
      ]);
      await reload();
      onChange?.();
    },
    [sheetName, dates, reload, onChange],
  );

  // 🔄 重做：跳 mistake + sessionStorage 传 sheetName
  const handleRedo = useCallback(
    (date: string) => {
      if (
        !confirm(
          `重做 ${date} 的错题？\n\n` +
            `会先删掉这天的所有数据，然后跳到错题集生成，让你重新上传 Excel。`,
        )
      )
        return;
      // 先删除该日期所有 sections（避免 docx-generator 抛"已存在"）
      (async () => {
        const sections = await loadAllSections({ sheetName, date });
        const allImageIds = sections.flatMap((s) => s.imageIds ?? []);
        await Promise.all([
          deleteImages(allImageIds),
          deleteSectionByDate(sheetName, date),
        ]);
        // sessionStorage 传 sheetName + date（mistake 流程用）
        sessionStorage.setItem("lekao-redo-sheet", sheetName);
        sessionStorage.setItem("lekao-redo-date", date);
        window.location.href = "/dashboard/mistake";
      })();
    },
    [sheetName],
  );

  // 没有历史日期 → 不渲染面板
  if (!loading && dates.length === 0) {
    return null;
  }

  return (
    <>
      <details className="rounded-xl border border-hairline bg-canvas-alt/30 overflow-hidden group">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-canvas-alt/50 transition select-none">
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-4 h-4 text-ink-muted" />
            <span className="text-sm font-medium text-ink">历史日期</span>
            <span className="text-xs text-ink-muted">（{sheetName}）</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-muted">
              共 {dates.length} 个日期
            </span>
            <span className="text-xs text-ink-subtle group-open:rotate-180 transition-transform">
              ▾
            </span>
          </div>
        </summary>

        <div className="border-t border-hairline bg-white px-4 py-3">
          {loading ? (
            <div className="text-sm text-ink-muted text-center py-3">
              加载中...
            </div>
          ) : (
            <div className="space-y-2">
              {dates.map((d) => (
                <div
                  key={d.date}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-canvas-alt/50 transition"
                >
                  {/* 日期 */}
                  <span className="text-sm font-medium text-ink tabular-nums">
                    {d.date}
                  </span>
                  {/* 学生数 chip */}
                  <span className="text-xs px-1.5 py-0.5 rounded bg-canvas-alt text-ink-muted">
                    {d.studentCount} 人
                  </span>
                  {/* 堂测题数 chip */}
                  {d.classroomQCount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-accent-soft text-accent-ink">
                      堂测 {d.classroomQCount}
                    </span>
                  )}
                  {/* 作业题数 chip */}
                  {d.homeworkQCount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-accent-soft text-accent-ink">
                      作业 {d.homeworkQCount}
                    </span>
                  )}
                  {/* 图片数 chip */}
                  {d.imageCount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-canvas-alt text-ink-subtle">
                      <ImageIcon className="inline w-3.5 h-3.5 align-text-bottom" />{" "}
                      {d.imageCount}
                    </span>
                  )}

                  {/* 操作按钮（推右侧） */}
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handlePreview(d.date)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-ink-muted hover:text-accent-text hover:bg-canvas-alt transition"
                      title="预览该日期的题号"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRedo(d.date)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-ink-muted hover:text-accent-text hover:bg-canvas-alt transition"
                      title="重做这天的（清掉数据 + 回到第 1 步重新上传 Excel）"
                    >
                      <RefreshIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(d.date, d.imageCount)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-ink-muted hover:text-danger hover:bg-canvas-alt transition"
                      title="删除这天的所有数据"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>

      {/* 👁 预览 modal */}
      {previewing && (
        <PreviewModal
          date={previewing.date}
          sections={previewing.sections}
          onClose={() => setPreviewing(null)}
        />
      )}
    </>
  );
}

// ============== 预览 Modal 子组件 ==============

function PreviewModal({
  date,
  sections,
  onClose,
}: {
  date: string;
  sections: SavedSection[];
  onClose: () => void;
}) {
  // 焦点陷阱 + Esc + 初始聚焦/焦点恢复（仅挂载即打开）
  const dialogRef = useDialogA11y({ open: true, onClose });
  // 聚合该日期所有学生的题号（去重）
  const allClassroomQ = new Set<string>();
  const allHomeworkQ = new Set<string>();
  let totalImages = 0;
  for (const sec of sections) {
    sec.classroomQNumbers?.forEach((q) => allClassroomQ.add(q));
    sec.homeworkQNumbers?.forEach((q) => allHomeworkQ.add(q));
    totalImages += sec.imageIds?.length ?? 0;
  }
  const classroomArr = [...allClassroomQ].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  const homeworkArr = [...allHomeworkQ].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="错题预览"
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl max-h-[80vh] overflow-y-auto focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-ink mb-1">预览 · {date}</h3>
        <p className="text-xs text-ink-muted mb-4">
          共 {sections.length} 个学生 ·{" "}
          <ImageIcon className="inline w-3.5 h-3.5 align-text-bottom" />{" "}
          {totalImages} 张图（图不显示）
        </p>

        {/* 堂测 */}
        <div className="mb-4">
          <div className="text-xs font-medium text-ink-muted mb-2">
            堂测错题（{classroomArr.length}）
          </div>
          {classroomArr.length === 0 ? (
            <div className="text-xs text-ink-subtle italic">无</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {classroomArr.map((q) => (
                <span
                  key={q}
                  className="text-xs px-2 py-0.5 rounded bg-accent-soft text-accent-ink font-mono"
                >
                  {q}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 作业 */}
        <div className="mb-4">
          <div className="text-xs font-medium text-ink-muted mb-2">
            作业错题（{homeworkArr.length}）
          </div>
          {homeworkArr.length === 0 ? (
            <div className="text-xs text-ink-subtle italic">无</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {homeworkArr.map((q) => (
                <span
                  key={q}
                  className="text-xs px-2 py-0.5 rounded bg-accent-soft text-accent-ink font-mono"
                >
                  {q}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-hairline">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg text-ink-muted hover:text-ink hover:bg-canvas-alt transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
