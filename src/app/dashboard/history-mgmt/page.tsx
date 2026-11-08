"use client";

/**
 * 错题集历史管理页（v3 新增 · 阶段 3）
 *
 * 功能：
 * - 顶部：📥 上传 history.json（跨设备恢复） + 📤 导出 + 总览
 * - 表格：所有 sections（学生 × 日期 × 学科），可搜索/筛选/分页
 * - 操作：👁 预览（题号+文字） / 🔄 重做（跳 mistake + sessionStorage） / 🗑 删除
 * - 底部：⚠️ 清空所有历史（双 confirm 二次确认）
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TopBar } from "@/components/dashboard/sidebar";
import {
  UploadIcon,
  DownloadIcon,
  TrashIcon,
  EyeIcon,
  RefreshIcon,
  SearchIcon,
  HistoryIcon,
  ImageIcon,
} from "@/components/icons";
import {
  loadAllSections,
  deleteSection,
  deleteSectionByDate,
  clearAllSections,
  type SavedSection,
} from "@/lib/mistake/section-store";
import { deleteImages } from "@/lib/mistake/image-store";
import {
  exportHistoryToJson,
  importHistoryFromJson,
  HISTORY_JSON_FILENAME,
  HISTORY_JSON_VERSION,
} from "@/lib/mistake/history-io";
import { saveAs } from "file-saver";
import type { QNumberSlot } from "@/lib/mistake/types";
import { useDialogA11y } from "@/lib/hooks/dialog-a11y";

const PAGE_SIZE = 20;

export default function HistoryMgmtPage() {
  const [allSections, setAllSections] = useState<SavedSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sheetFilter, setSheetFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewing, setPreviewing] = useState<SavedSection | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadAllSections();
      setAllSections(data.sort((a, b) => b.date.localeCompare(a.date)));
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, []);

  // reload 首行即 setLoading(true)：用 0ms 调度把它移出 effect 同步路径，
  // 避免 effect 内同步 setState 触发级联渲染（react-hooks/set-state-in-effect）
  useEffect(() => {
    const t = setTimeout(reload, 0);
    return () => clearTimeout(t);
  }, [reload]);

  // 学科去重
  const distinctSheets = useMemo(
    () => Array.from(new Set(allSections.map((s) => s.sheetName))).sort(),
    [allSections],
  );

  // 过滤
  const filtered = useMemo(() => {
    return allSections.filter((s) => {
      if (
        search &&
        !s.studentName.includes(search) &&
        !s.sheetName.includes(search)
      ) {
        return false;
      }
      if (sheetFilter && s.sheetName !== sheetFilter) return false;
      return true;
    });
  }, [allSections, search, sheetFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 总览统计
  const stats = useMemo(() => {
    const totalStudents = new Set(allSections.map((s) => s.studentName)).size;
    const totalSheets = distinctSheets.length;
    return {
      sections: allSections.length,
      students: totalStudents,
      sheets: totalSheets,
    };
  }, [allSections, distinctSheets]);

  // ============ 操作 handlers ============

  const handleExport = useCallback(async () => {
    const history = await exportHistoryToJson();
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, HISTORY_JSON_FILENAME);
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const mode = confirm(
          `检测到 ${Array.isArray(json?.sections) ? json.sections.length : "?"} 条记录。\n\n` +
            `【确定】= 覆盖（先清空再导入）\n` +
            `【取消】= 合并（跳过已存在的）`,
        )
          ? ("overwrite" as const)
          : ("merge" as const);
        const result = await importHistoryFromJson(json, mode);
        alert(
          `导入完成：新增 ${result.added} · 更新 ${result.updated} · 跳过 ${result.skipped}`,
        );
        await reload();
      } catch (e) {
        alert(`导入失败：${e instanceof Error ? e.message : "未知错误"}`);
      } finally {
        setImporting(false);
      }
    },
    [reload],
  );

  const handleDeleteOne = useCallback(
    async (sec: SavedSection) => {
      if (
        !confirm(`删除 ${sec.studentName} · ${sec.date} 的记录？此操作不可撤销`)
      )
        return;
      if (sec.imageIds?.length) await deleteImages(sec.imageIds);
      await deleteSection(sec.sheetName, sec.studentName, sec.date);
      await reload();
    },
    [reload],
  );

  const handleDeleteSelected = useCallback(async () => {
    if (selected.size === 0) return;
    if (!confirm(`删除选中的 ${selected.size} 条记录？此操作不可撤销`)) return;
    const targets = allSections.filter((s) => selected.has(s.id));
    const allImageIds = targets.flatMap((s) => s.imageIds ?? []);
    if (allImageIds.length) await deleteImages(allImageIds);
    for (const sec of targets) {
      await deleteSection(sec.sheetName, sec.studentName, sec.date);
    }
    setSelected(new Set());
    await reload();
  }, [selected, allSections, reload]);

  const handleClearAll = useCallback(async () => {
    if (
      !confirm(
        "⚠️ 危险操作：清空所有错题集历史？\n\n会删掉全部记录（不影响 docx 文件本身）\n\n此操作不可撤销",
      )
    )
      return;
    if (!confirm("再次确认：清空所有记录？")) return;
    await clearAllSections();
    setSelected(new Set());
    await reload();
  }, [reload]);

  const handleRedo = useCallback((sec: SavedSection) => {
    if (
      !confirm(
        `重做 ${sec.sheetName} · ${sec.date} 的错题？\n\n` +
          `会先删掉这条记录（避免 docx 重复），然后跳到错题集生成，让你重新上传 Excel。`,
      )
    )
      return;
    (async () => {
      // 先删除该日期的所有 sections（同一天可能有多个学生）
      const sections = await loadAllSections({
        sheetName: sec.sheetName,
        date: sec.date,
      });
      const allImageIds = sections.flatMap((s) => s.imageIds ?? []);
      await Promise.all([
        deleteImages(allImageIds),
        deleteSectionByDate(sec.sheetName, sec.date),
      ]);
      sessionStorage.setItem("lekao-redo-sheet", sec.sheetName);
      sessionStorage.setItem("lekao-redo-date", sec.date);
      window.location.href = "/dashboard/mistake";
    })();
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selected.size === paged.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paged.map((s) => s.id)));
    }
  }, [selected.size, paged]);

  return (
    <>
      <TopBar
        title="错题集历史管理"
        description={`所有错题记录都存在浏览器本地。共 ${stats.sections} 条记录 · ${stats.students} 个学生 · ${stats.sheets} 个学科`}
        rightExtra={
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 bg-canvas-alt text-ink-muted text-xs font-medium rounded-full border border-hairline">
            <HistoryIcon className="w-3 h-3" />v{HISTORY_JSON_VERSION}
          </span>
        }
      />

      <div className="px-6 md:px-10 py-8 max-w-6xl space-y-6">
        {/* ===== 操作栏 ===== */}
        <div className="rounded-2xl border border-hairline bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-text text-white text-sm font-medium hover:bg-accent-hover transition disabled:opacity-50"
            >
              <UploadIcon className="w-4 h-4" />
              {importing ? "导入中..." : "上传 history.json"}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-accent-line text-accent-ink text-sm font-medium hover:bg-accent-soft transition"
            >
              <DownloadIcon className="w-4 h-4" />
              导出 history.json
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selected.size === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-ink-muted hover:text-danger hover:bg-canvas-alt transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <TrashIcon className="w-4 h-4" />
              删除选中（{selected.size}）
            </button>
            <span className="ml-auto text-xs text-ink-muted">
              💡 history.json 不含图片本身，只有题号、文字和图片引用
            </span>
          </div>
        </div>

        {/* ===== 空状态 ===== */}
        {!loading && allSections.length === 0 && (
          <div className="rounded-2xl border border-dashed border-hairline bg-canvas-alt/30 p-12 text-center">
            <HistoryIcon className="w-12 h-12 mx-auto text-ink-subtle mb-3" />
            <h2 className="text-lg font-medium text-ink mb-2">
              本地暂无错题集历史
            </h2>
            <p className="text-sm text-ink-muted mb-5">
              如果你换过电脑或清过浏览器缓存，可以上传之前导出的 history.json
              恢复
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-accent-text text-white text-sm font-medium hover:bg-accent-hover transition"
            >
              <UploadIcon className="w-4 h-4" />
              上传 history.json 恢复
            </button>
          </div>
        )}

        {/* ===== 筛选 + 表格 ===== */}
        {allSections.length > 0 && (
          <div className="rounded-2xl border border-hairline bg-white overflow-hidden">
            {/* 筛选行 */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-hairline">
              <div className="relative flex-1 min-w-[200px]">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="搜索学生名 / 学科..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-hairline bg-white focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <select
                value={sheetFilter}
                onChange={(e) => {
                  setSheetFilter(e.target.value);
                  setPage(1);
                }}
                className="text-sm rounded-lg border border-hairline px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="">全部学科</option>
                {distinctSheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-canvas-alt/40 text-xs text-ink-subtle">
                  <tr>
                    <th className="px-3 py-2.5 text-left w-8">
                      <input
                        type="checkbox"
                        checked={
                          selected.size === paged.length && paged.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-accent"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium">学生</th>
                    <th className="px-3 py-2.5 text-left font-medium">学科</th>
                    <th className="px-3 py-2.5 text-left font-medium">日期</th>
                    <th className="px-3 py-2.5 text-left font-medium">堂测</th>
                    <th className="px-3 py-2.5 text-left font-medium">作业</th>
                    <th className="px-3 py-2.5 text-left font-medium">图片</th>
                    <th className="px-3 py-2.5 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-8 text-center text-sm text-ink-muted"
                      >
                        没找到匹配的记录
                      </td>
                    </tr>
                  ) : (
                    paged.map((sec) => (
                      <tr
                        key={sec.id}
                        className="border-t border-hairline hover:bg-canvas-alt/30 transition"
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected.has(sec.id)}
                            onChange={() => toggleSelect(sec.id)}
                            className="w-4 h-4 accent-accent"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium text-ink">
                          {sec.studentName}
                        </td>
                        <td className="px-3 py-2.5 text-ink-muted">
                          {sec.sheetName}
                        </td>
                        <td className="px-3 py-2.5 text-ink-muted tabular-nums">
                          {sec.date}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-accent-soft text-accent-ink">
                            {sec.classroomQNumbers?.length ?? 0}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-accent-soft text-accent-ink">
                            {sec.homeworkQNumbers?.length ?? 0}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-ink-muted">
                          {sec.imageIds?.length ?? 0}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewing(sec)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded text-ink-muted hover:text-accent-text hover:bg-canvas-alt transition"
                              title="预览"
                            >
                              <EyeIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRedo(sec)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded text-ink-muted hover:text-accent-text hover:bg-canvas-alt transition"
                              title="重做"
                            >
                              <RefreshIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOne(sec)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded text-ink-muted hover:text-danger hover:bg-canvas-alt transition"
                              title="删除"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 px-5 py-4 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-sm px-3 py-1 rounded border border-hairline text-ink-muted hover:text-ink hover:bg-canvas-alt disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← 上一页
                </button>
                <span className="text-sm text-ink-muted">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-sm px-3 py-1 rounded border border-hairline text-ink-muted hover:text-ink hover:bg-canvas-alt disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页 →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== 底部危险区 ===== */}
        {allSections.length > 0 && (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-danger-text mb-1">
                  ⚠️ 清空所有错题集历史
                </h3>
                <p className="text-xs text-ink-muted">
                  会删掉全部 {stats.sections} 条记录（不影响电脑里的 .docx
                  文件）。 清空前记得先导出 history.json 备份。
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearAll}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-danger hover:bg-danger/90 transition"
              >
                <TrashIcon className="w-4 h-4" />
                清空全部
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== 预览 Modal ===== */}
      {previewing && (
        <PreviewModal
          section={previewing}
          onClose={() => setPreviewing(null)}
        />
      )}
    </>
  );
}

// ============== 预览 Modal 子组件 ==============

function PreviewModal({
  section,
  onClose,
}: {
  section: SavedSection;
  onClose: () => void;
}) {
  // 焦点陷阱 + Esc + 初始聚焦/焦点恢复（仅挂载即打开）
  const dialogRef = useDialogA11y({ open: true, onClose });
  const classroomSlots: QNumberSlot[] = useMemo(
    () => JSON.parse(section.classroomSlotsJson || "[]"),
    [section.classroomSlotsJson],
  );
  const homeworkSlots: QNumberSlot[] = useMemo(
    () => JSON.parse(section.homeworkSlotsJson || "[]"),
    [section.homeworkSlotsJson],
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
        aria-label="错题集详情"
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl max-h-[80vh] overflow-y-auto focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-ink mb-1">
          {section.studentName} · {section.sheetName}
        </h3>
        <p className="text-xs text-ink-muted mb-4 tabular-nums">
          {section.date} ·{" "}
          <ImageIcon className="inline w-3.5 h-3.5 align-text-bottom" />{" "}
          {section.imageIds?.length ?? 0} 张图（不显示图本身）
        </p>

        {/* 堂测 */}
        <div className="mb-4">
          <div className="text-xs font-medium text-ink-muted mb-2">
            堂测错题（{classroomSlots.length}）
          </div>
          {classroomSlots.length === 0 ? (
            <div className="text-xs text-ink-subtle italic">无</div>
          ) : (
            <ul className="space-y-1.5">
              {classroomSlots.map((slot, i) => (
                <li
                  key={i}
                  className="rounded border border-hairline bg-canvas-alt/30 p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-accent-text text-sm">
                      {slot.qNumber}
                    </span>
                    {slot.isMarkedAllCorrect && (
                      <span className="text-xs text-success-text">✓ 全对</span>
                    )}
                  </div>
                  {slot.textContent ? (
                    <div className="text-ink-muted text-xs mt-1 whitespace-pre-wrap">
                      {slot.textContent}
                    </div>
                  ) : (
                    <div className="text-ink-subtle text-xs italic mt-1">
                      （无文字）
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 作业 */}
        <div className="mb-4">
          <div className="text-xs font-medium text-ink-muted mb-2">
            作业错题（{homeworkSlots.length}）
          </div>
          {homeworkSlots.length === 0 ? (
            <div className="text-xs text-ink-subtle italic">无</div>
          ) : (
            <ul className="space-y-1.5">
              {homeworkSlots.map((slot, i) => (
                <li
                  key={i}
                  className="rounded border border-hairline bg-canvas-alt/30 p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-accent-text text-sm">
                      {slot.qNumber}
                    </span>
                    {slot.isMarkedAllCorrect && (
                      <span className="text-xs text-success-text">✓ 全对</span>
                    )}
                  </div>
                  {slot.textContent ? (
                    <div className="text-ink-muted text-xs mt-1 whitespace-pre-wrap">
                      {slot.textContent}
                    </div>
                  ) : (
                    <div className="text-ink-subtle text-xs italic mt-1">
                      （无文字）
                    </div>
                  )}
                </li>
              ))}
            </ul>
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
