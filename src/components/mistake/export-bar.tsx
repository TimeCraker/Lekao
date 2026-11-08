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
import { runBatch } from "@/lib/deliver/batch-export";
import {
  clearSavedDirectory,
  getOrCreateSubdir,
  loadSavedDirectory,
  requestDirectory,
  writeFile,
} from "@/lib/mistake/fs-access";
import { generateBatchDocx } from "@/lib/mistake/docx-generator";
import type { MistakeCollection, QNumberSlot } from "@/lib/mistake/types";
import { CheckIcon, DownloadIcon } from "@/components/icons";
import { writeHistoryJson } from "@/lib/mistake/history-io";

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
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(
    null,
  );
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
    /** v3 新增：history.json 是否同步成功（method + size）*/
    historyWritten?: { method: "fs-access" | "download"; size: number };
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

    // ⭐ 关键修复（Round 2026-06-25 · FSA user gesture + 权限过期 bug）：
    //   两个根因都会触发 NotAllowedError：
    //   1) user gesture 断了（getDirectoryHandle 不在 click 同步栈第一个 await）
    //   2) Chrome 24h 后自动撤销 FSA 权限（IndexedDB 里 handle 还在但实际不可用）
    //
    //   修法：
    //   - 第一个根因：把 getOrCreateSubdir 提到任何 setState 之前，紧贴 user gesture
    //   - 第二个根因：catch 里检测 NotAllowedError → 调 requestPermission 重新授权
    //     （仍在 click 同步栈里，requestPermission 能真正弹窗）→ 重试
    //   报错文案参考：https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker
    let subjectDir: FileSystemDirectoryHandle;
    try {
      subjectDir = await getOrCreateSubdir(dirHandle, collection.sheetName);
    } catch (e) {
      const errorName = e instanceof Error ? e.name : "";
      const errorMsg = e instanceof Error ? e.message : String(e);

      // 权限过期场景：try 重新授权（此时仍在 user gesture 栈）
      if (errorName === "NotAllowedError") {
        try {
          // requestPermission 不在标准 FileSystemDirectoryHandle 类型里（DOM lib 缺），
          // 但 Chrome/Edge 实测支持。沿用 fs-access.ts 的 unknown-cast 模式保持一致。
          const permission = await (
            dirHandle as unknown as {
              requestPermission: (options: {
                mode: "readwrite";
              }) => Promise<PermissionState>;
            }
          ).requestPermission({ mode: "readwrite" });
          if (permission === "granted") {
            // 重新授权成功 → 重试
            subjectDir = await getOrCreateSubdir(
              dirHandle,
              collection.sheetName,
            );
          } else {
            alert(
              `权限被拒绝，无法导出。\n请重新点击"授权文件夹"按钮选择目录。`,
            );
            return;
          }
        } catch (reauthErr) {
          alert(
            `重新授权失败：${reauthErr instanceof Error ? reauthErr.message : "未知错误"}\n请重新点击"授权文件夹"按钮。`,
          );
          return;
        }
      } else {
        alert(`导出失败：${errorMsg}`);
        return;
      }
    }

    setExporting(true);
    setResult(null);
    setProgress({ done: 0, total: studentNames.length });

    let success = 0;
    let failed = 0;
    const errors: Array<{ student: string; reason: string }> = [];

    try {
      // 批量生成（库内部每份之间让出主线程，T-405）
      const docs = await generateBatchDocx(studentNames, {
        sheetName: collection.sheetName,
        classroomName: collection.classroomName,
        date: collection.date,
        classroomSlots,
        homeworkSlots,
        cumulative: true,
        students: collection.students,
      });

      // 写入文件：串行队列，一份失败不中止整批
      const writeResults = await runBatch(
        docs,
        (doc) => writeFile(subjectDir, doc.filename, doc.blob),
        {
          onProgress: (done, total, item) =>
            setProgress({ done, total, currentStudent: item.studentName }),
        },
      );
      success = writeResults.filter((r) => r.ok).length;
      failed = writeResults.length - success;
      for (const r of writeResults) {
        if (!r.ok) {
          errors.push({
            student: r.item.studentName,
            reason: r.error ?? "未知错误",
          });
        }
      }

      // v4.4 改：写 history.json 到学科子目录（跟 docx 同级）而不是用户最外层目录
      let historyWritten:
        { method: "fs-access" | "download"; size: number } | undefined;
      if (success > 0) {
        try {
          historyWritten = await writeHistoryJson(dirHandle, subjectDir);
        } catch (e) {
          console.warn(
            "[history.json] 写入失败，不影响 docx 导出",
            e instanceof Error ? e.message : e,
          );
        }
      }
      setResult({ success, failed, errors, historyWritten });
    } catch (e) {
      alert(`导出失败：${e instanceof Error ? e.message : "未知错误"}`);
    } finally {
      setExporting(false);
      setProgress(null);
    }
  }, [dirHandle, studentNames, collection, classroomSlots, homeworkSlots]);

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
        classroomName: collection.classroomName,
        date: collection.date,
        classroomSlots,
        homeworkSlots,
        cumulative: true,
        students: collection.students,
      });

      // 浏览器直接逐个下载（简化处理，不用 JSZip）；串行队列 + 每份间隔，权限弹窗不打断队列
      const downloadResults = await runBatch(
        docs,
        async (doc) => {
          saveAs(doc.blob, `${collection.sheetName}/${doc.filename}`);
          // 浏览器多次下载会弹权限，加点间隔
          await new Promise((r) => setTimeout(r, 200));
        },
        {
          onProgress: (done, total, item) =>
            setProgress({ done, total, currentStudent: item.studentName }),
        },
      );
      success = downloadResults.filter((r) => r.ok).length;
      failed = downloadResults.length - success;
      for (const r of downloadResults) {
        if (!r.ok) {
          errors.push({
            student: r.item.studentName,
            reason: r.error ?? "未知错误",
          });
        }
      }

      // v3 新增：下载模式同样写 history.json（不传 dirHandle → 自动 file-saver 下载）
      let historyWritten:
        { method: "fs-access" | "download"; size: number } | undefined;
      if (success > 0) {
        try {
          historyWritten = await writeHistoryJson();
        } catch (e) {
          console.warn(
            "[history.json] 写入失败，不影响 docx 下载",
            e instanceof Error ? e.message : e,
          );
        }
      }
      setResult({ success, failed, errors, historyWritten });
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
          <DownloadIcon className="w-4 h-4 text-ink-subtle" />
          <span className="text-ink-mute">本地文件夹：</span>
          {dirHandle ? (
            <span className="inline-flex items-center gap-1 font-medium text-success-text">
              <CheckIcon className="w-3.5 h-3.5" />
              已授权「{dirHandle.name}」
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
              className="inline-flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-md bg-canvas-alt text-ink hover:bg-accent-soft hover:text-accent-ink transition"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              授权文件夹
            </button>
          )
        ) : (
          <span className="text-xs text-ink-subtle">
            （用 Chrome / Edge 才能授权文件夹）
          </span>
        )}
      </div>

      {/* 输出路径预览 */}
      <div className="text-xs text-ink-subtle font-mono">
        输出路径：
        {dirHandle
          ? `${dirHandle.name}/${collection.sheetName}/{学生姓名}.docx`
          : "授权后显示"}
        <br />
        <span className="text-ink-mute">
          history.json → 同目录（跟 docx 并列）
        </span>
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
              : `导出 ${studentNames.length} 份错题集 docx`}
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
              : `直接下载 ${studentNames.length} 份 docx`}
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
            ? `成功导出 ${result.success} 份 docx`
            : `${result.success} 成功 · ${result.failed} 失败`}
          {/* v3 新增：history.json 同步状态 */}
          {result.historyWritten && (
            <div className="mt-2 text-xs text-success-text flex items-center gap-1">
              <CheckIcon className="w-3 h-3" />
              history.json 已同步（
              {(result.historyWritten.size / 1024).toFixed(1)} KB ·{" "}
              {result.historyWritten.method === "fs-access"
                ? "本地文件夹"
                : "浏览器下载"}
              ）
            </div>
          )}
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs">查看失败详情</summary>
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
