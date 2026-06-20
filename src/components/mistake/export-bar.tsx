"use client";

/**
 * Step 4 · 导出栏（T21 + T22 集成）
 * 来源：STAGE spec §6.1 Step 4
 *
 * 功能：
 * - 授权本地文件夹（File System Access API）
 * - 批量导出选中学生的 docx
 * - 累积模式自动合并历史 sections
 * - 失败兜底：file-saver 直接下载（Safari/Firefox）
 */

import { useCallback, useEffect, useState } from "react";
import { saveAs } from "file-saver";
import {
  checkFileExists,
  clearSavedDirectory,
  getOrCreateSubdir,
  isFileSystemAccessSupported,
  loadSavedDirectory,
  requestDirectory,
  writeFile,
} from "@/lib/mistake/fs-access";
import { generateBatchDocx } from "@/lib/mistake/docx-generator";
import type { MistakeCollection, QNumberSlot } from "@/lib/mistake/types";

export interface ExportBarProps {
  collection: MistakeCollection;
  classroomSlots: QNumberSlot[];
  homeworkSlots: QNumberSlot[];
  studentNames: string[];
  isFsAccessSupported: boolean;
}

export function ExportBar({
  collection,
  classroomSlots,
  homeworkSlots,
  studentNames,
  isFsAccessSupported,
}: ExportBarProps) {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    currentStudent?: string;
  } | null>(null);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ student: string; reason: string }>;
  } | null>(null);

  // 启动时尝试恢复已授权目录
  useEffect(() => {
    if (!isFsAccessSupported) return;
    loadSavedDirectory()
      .then((h) => setDirHandle(h))
      .catch(() => setDirHandle(null));
  }, [isFsAccessSupported]);

  const authorize = useCallback(async () => {
    try {
      const handle = await requestDirectory();
      setDirHandle(handle);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        // 用户取消
        return;
      }
      alert(
        `授权失败：${e instanceof Error ? e.message : "未知错误"}\n\n请使用 Chrome 或 Edge 浏览器`,
      );
    }
  }, []);

  const clearAuthorization = useCallback(async () => {
    await clearSavedDirectory();
    setDirHandle(null);
  }, []);

  const exportToFolder = useCallback(async () => {
    if (!dirHandle || studentNames.length === 0) return;

    setExporting(true);
    setResult(null);
    setProgress({ done: 0, total: studentNames.length });

    let success = 0;
    let failed = 0;
    const errors: Array<{ student: string; reason: string }> = [];

    try {
      // 创建学科子目录
      const subjectDir = await getOrCreateSubdir(
        dirHandle,
        collection.sheetName,
      );

      // 批量生成
      const docs = await generateBatchDocx(studentNames, {
        sheetName: collection.sheetName,
        date: collection.date,
        classroomSlots,
        homeworkSlots,
        cumulative: true,
      });

      // 写入文件
      for (let i = 0; i < docs.length; i++) {
        const { studentName, blob, filename } = docs[i];
        setProgress({
          done: i,
          total: docs.length,
          currentStudent: studentName,
        });

        try {
          await writeFile(subjectDir, filename, blob);
          success++;
        } catch (e) {
          failed++;
          errors.push({
            student: studentName,
            reason: e instanceof Error ? e.message : "未知错误",
          });
        }

        setProgress({ done: i + 1, total: docs.length });
      }

      setResult({ success, failed, errors });
    } catch (e) {
      alert(`导出失败：${e instanceof Error ? e.message : "未知错误"}`);
    } finally {
      setExporting(false);
      setProgress(null);
    }
  }, [
    dirHandle,
    studentNames,
    collection,
    classroomSlots,
    homeworkSlots,
  ]);

  // 兜底：浏览器下载（Safari/Firefox / 不想用文件夹）
  const downloadAsZip = useCallback(async () => {
    if (studentNames.length === 0) return;

    setExporting(true);
    setResult(null);
    setProgress({ done: 0, total: studentNames.length });

    let success = 0;
    let failed = 0;
    const errors: Array<{ student: string; reason: string }> = [];

    try {
      const docs = await generateBatchDocx(studentNames, {
        sheetName: collection.sheetName,
        date: collection.date,
        classroomSlots,
        homeworkSlots,
        cumulative: true,
      });

      // 浏览器直接逐个下载（简化处理，不用 JSZip）
      for (let i = 0; i < docs.length; i++) {
        const { studentName, blob, filename } = docs[i];
        setProgress({
          done: i,
          total: docs.length,
          currentStudent: studentName,
        });

        try {
          saveAs(blob, `${collection.sheetName}/${filename}`);
          success++;
          // 浏览器多次下载会弹权限，加点间隔
          await new Promise((r) => setTimeout(r, 200));
        } catch (e) {
          failed++;
          errors.push({
            student: studentName,
            reason: e instanceof Error ? e.message : "未知错误",
          });
        }
        setProgress({ done: i + 1, total: docs.length });
      }

      setResult({ success, failed, errors });
    } catch (e) {
      alert(`下载失败：${e instanceof Error ? e.message : "未知错误"}`);
    } finally {
      setExporting(false);
      setProgress(null);
    }
  }, [studentNames, collection, classroomSlots, homeworkSlots]);

  const disabled = studentNames.length === 0 || exporting;

  return (
    <div className="rounded-xl border border-hairline bg-white p-5 space-y-4">
      {/* 文件夹授权状态 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span aria-hidden>📂</span>
          <span className="text-ink-mute">本地文件夹：</span>
          {dirHandle ? (
            <span className="font-medium text-success-text">
              ✓ 已授权「{dirHandle.name}」
            </span>
          ) : (
            <span className="text-ink-muted">未授权</span>
          )}
        </div>
        {isFsAccessSupported ? (
          dirHandle ? (
            <button
              type="button"
              onClick={clearAuthorization}
              className="text-xs px-3 py-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-canvas-alt transition"
            >
              切换文件夹
            </button>
          ) : (
            <button
              type="button"
              onClick={authorize}
              disabled={exporting}
              className="text-sm px-4 py-1.5 rounded-md bg-canvas-alt text-ink hover:bg-accent-soft hover:text-accent-ink transition"
            >
              🔓 授权文件夹
            </button>
          )
        ) : (
          <span className="text-xs text-ink-subtle">
            （请使用 Chrome / Edge 体验完整功能）
          </span>
        )}
      </div>

      {/* 输出路径预览 */}
      <div className="text-xs text-ink-subtle font-mono">
        输出路径：{dirHandle ? `${dirHandle.name}/${collection.sheetName}/{学生姓名}.docx` : "授权后显示"}
      </div>

      {/* 导出按钮 */}
      <div className="flex flex-wrap gap-3">
        {isFsAccessSupported && dirHandle && (
          <button
            type="button"
            onClick={exportToFolder}
            disabled={disabled}
            className="flex-1 min-w-[200px] px-5 py-3 rounded-xl bg-accent-text text-white text-sm font-medium hover:bg-accent-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting && progress
              ? `导出中 ${progress.done}/${progress.total}${progress.currentStudent ? ` · ${progress.currentStudent}` : ""}`
              : `📤 导出 ${studentNames.length} 份错题集 docx`}
          </button>
        )}

        {!dirHandle && (
          <button
            type="button"
            onClick={downloadAsZip}
            disabled={disabled}
            className="flex-1 min-w-[200px] px-5 py-3 rounded-xl bg-accent-text text-white text-sm font-medium hover:bg-accent-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting && progress
              ? `下载中 ${progress.done}/${progress.total}`
              : `📥 直接下载 ${studentNames.length} 份 docx`}
          </button>
        )}
      </div>

      {/* 进度条 */}
      {exporting && progress && (
        <div className="h-1.5 bg-canvas-alt rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-200"
            style={{
              width: `${(progress.done / progress.total) * 100}%`,
            }}
          />
        </div>
      )}

      {/* 结果 */}
      {result && (
        <div
          role="status"
          className={`rounded-lg p-3 text-sm ${
            result.failed === 0
              ? "bg-success-soft/30 text-success-text"
              : "bg-warning/10 text-warning"
          }`}
        >
          {result.failed === 0
            ? `✅ 成功导出 ${result.success} 份 docx`
            : `⚠️ ${result.success} 成功 · ${result.failed} 失败`}
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs">
                查看失败详情
              </summary>
              <ul className="mt-2 text-xs space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    · {e.student}: {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}