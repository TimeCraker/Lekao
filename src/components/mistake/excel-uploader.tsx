"use client";

/**
 * Step 1 · Excel 拖拽上传组件
 * 来源：STAGE spec §6.1
 *
 * 交互：
 * - 拖拽 .xlsx/.xls 到这里
 * - 或点击选择文件
 * - 解析中显示 loading
 * - 错误提示（不支持的格式 / 列名找不到）
 */

import { useCallback, useState } from "react";
import { useReducedMotion } from "motion/react";
import { parseWorkbook } from "@/lib/mistake/excel-parser";
import { UploadIcon, ResetIcon } from "@/components/icons";

export interface ExcelUploaderProps {
  onWorkbookReady: (
    workbook: import("xlsx").WorkBook,
    file: File,
  ) => void;
}

export function ExcelUploader({ onWorkbookReady }: ExcelUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const reducedMotion = useReducedMotion();

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // 文件类型校验
      const ext = file.name.toLowerCase();
      if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls")) {
        setError("仅支持 .xlsx / .xls 格式");
        return;
      }

      // 文件大小校验（20MB）
      if (file.size > 20 * 1024 * 1024) {
        setError("文件超过 20MB，请拆分后再上传");
        return;
      }

      setLoading(true);
      try {
        const workbook = await parseWorkbook(file);
        onWorkbookReady(workbook, file);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "解析失败");
      } finally {
        setLoading(false);
      }
    },
    [onWorkbookReady],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // 重置 input value，允许同名文件重复上传
      e.target.value = "";
    },
    [handleFile],
  );

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`
          relative block cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center
          transition
          ${dragOver ? "border-accent bg-accent-soft/40" : "border-hairline bg-white hover:border-accent"}
          ${loading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={onChange}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="选择 Excel 文件"
          disabled={loading}
        />
        <div className="mb-3 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-soft text-accent-text">
          {loading ? (
            <ResetIcon className="w-7 h-7 animate-spin" />
          ) : (
            <UploadIcon className="w-7 h-7" />
          )}
        </div>
        <div className="text-base font-medium text-ink">
          {loading ? "解析中…" : "拖拽 Excel 到这里 或 点击选择"}
        </div>
        <div className="mt-2 text-sm text-ink-muted">
          支持 .xlsx / .xls · GBK 编码 · 合并单元格
        </div>
        {loading && !reducedMotion && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-accent/20 overflow-hidden">
            <div className="h-full w-1/3 bg-accent animate-[loading_1s_ease-in-out_infinite]" />
          </div>
        )}
      </label>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}