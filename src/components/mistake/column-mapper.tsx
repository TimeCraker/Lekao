"use client";

/**
 * Step 2.5 · 列名映射确认（v3 新增）
 *
 * 功能：
 * - 展示自动识别的列映射（姓名 / 堂测错题 / 作业错题）
 * - 每个字段支持下拉手动选择真实表头列
 * - 适用于识别错误或表头字段不在标准关键词列表中的场景
 */

import { useState } from "react";
import type { HeaderScanResult } from "@/lib/mistake/excel-parser";

export interface ColumnMappingConfig {
  nameCol: number;
  classroomCol: number;
  homeworkCol: number;
}

export interface ColumnMapperProps {
  scan: HeaderScanResult;
  onConfirm: (mapping: ColumnMappingConfig) => void;
  onBack: () => void;
}

type FieldKey = "nameCol" | "classroomCol" | "homeworkCol";

interface FieldDef {
  key: FieldKey;
  label: string;
  hint: string;
}

const FIELDS: FieldDef[] = [
  { key: "nameCol", label: "姓名", hint: "学生姓名列" },
  { key: "classroomCol", label: "堂测错题", hint: "课堂测验的错题号列" },
  { key: "homeworkCol", label: "作业错题", hint: "课后作业的错题号列" },
];

export function ColumnMapper({
  scan,
  onConfirm,
  onBack,
}: ColumnMapperProps) {
  const { headers, detected } = scan;

  // 初始化映射：自动检测值（可能是 -1），如果为 -1 则默认不选
  const initMapping: ColumnMappingConfig = {
    nameCol: detected.nameCol,
    classroomCol: detected.classroomCol,
    homeworkCol: detected.homeworkCol,
  };
  const [mapping, setMapping] = useState<ColumnMappingConfig>(initMapping);

  // 选择或取消选择某个列
  const selectField = (fieldKey: FieldKey, colIndex: number) => {
    setMapping((prev) => {
      const next = { ...prev, [fieldKey]: colIndex };

      // 如果新选的列已被其他字段占用，清除那个字段的旧选择
      // （-1 表示不选择，不参与冲突判断）
      if (colIndex >= 0) {
        for (const f of FIELDS) {
          if (f.key !== fieldKey && next[f.key] === colIndex) {
            next[f.key] = -1;
          }
        }
      }

      return next;
    });
  };

  const allDetected = detected.nameCol >= 0
    && detected.classroomCol >= 0
    && detected.homeworkCol >= 0;

  return (
    <div>
      {/* 自动识别结果 */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-ink">自动识别的列映射</span>
          {allDetected ? (
            <span className="text-xs px-2 py-0.5 bg-success-soft text-success-text rounded-full">
              全部识别成功
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 bg-danger/10 text-danger rounded-full">
              部分列未识别
            </span>
          )}
        </div>
        <div className="text-xs text-ink-muted">
          如果识别有误，请在下拉菜单中手动选择正确的列
        </div>
      </div>

      {/* 字段→列映射行 */}
      <div className="space-y-3">
        {FIELDS.map((field) => {
          const colIndex = mapping[field.key];
          const colName = colIndex >= 0 && colIndex < headers.length
            ? headers[colIndex]
            : null;
          const isDetected = detected[field.key] >= 0;

          return (
            <div
              key={field.key}
              className="flex items-center gap-3 rounded-xl border border-hairline bg-white p-4"
            >
              {/* 字段标签 */}
              <div className="w-28 shrink-0">
                <div className="text-sm font-medium text-ink">{field.label}</div>
                <div className="text-xs text-ink-muted">{field.hint}</div>
              </div>

              {/* 下拉选择器 */}
              <div className="flex-1">
                <select
                  value={colIndex}
                  onChange={(e) => selectField(field.key, Number(e.target.value))}
                  className={`
                    w-full rounded-lg border px-3 py-2 text-sm bg-white appearance-none
                    ${colIndex >= 0
                      ? "border-hairline text-ink"
                      : "border-danger/50 text-danger"}
                    focus:outline-none focus:ring-2 focus:ring-accent/50
                  `}
                >
                  <option value={-1}>（不识别此列）</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `（列 ${i + 1}）`}
                      {detected.nameCol === i || detected.classroomCol === i || detected.homeworkCol === i
                        ? " [自动识别]"
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 识别状态 */}
              <div className="w-20 shrink-0 text-right">
                {colIndex >= 0 ? (
                  <span className="text-xs font-medium text-success-text">
                    → 列 {colIndex + 1}
                  </span>
                ) : (
                  <span className="text-xs text-danger">未选择</span>
                )}
                {isDetected && colIndex !== detected[field.key] && (
                  <div className="text-[10px] text-accent-text">
                    （已手动改）
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 表头预览 */}
      <div className="mt-6 rounded-xl border border-hairline bg-canvas-alt/30 p-4">
        <div className="text-xs font-medium text-ink-muted mb-2">
          表头行预览（共 {headers.length} 列）
        </div>
        <div className="flex flex-wrap gap-2">
          {headers.map((h, i) => {
            const isSelected = mapping.nameCol === i
              || mapping.classroomCol === i
              || mapping.homeworkCol === i;
            const fieldKey = mapping.nameCol === i
              ? "姓名"
              : mapping.classroomCol === i
              ? "堂测"
              : mapping.homeworkCol === i
              ? "作业"
              : null;
            return (
              <span
                key={i}
                className={`
                  inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono
                  ${isSelected
                    ? "bg-accent text-white"
                    : "bg-white border border-hairline text-ink-subtle"}
                `}
              >
                <span>{h || `列${i + 1}`}</span>
                {fieldKey && (
                  <span className="text-[10px] opacity-75">({fieldKey})</span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-hairline bg-white text-ink-muted hover:text-ink hover:border-ink-muted transition"
        >
          ← 重新选 Sheet
        </button>

        <div className="flex items-center gap-3">
          <div className="text-xs text-ink-muted">
            {mapping.nameCol < 0
              ? "⚠️ 未选择「姓名」列"
              : mapping.classroomCol < 0 || mapping.homeworkCol < 0
              ? "💡 堂测或作业列为空也可以继续"
              : "✅ 映射完整"}
          </div>
          <button
            type="button"
            onClick={() => onConfirm(mapping)}
            disabled={mapping.nameCol < 0}
            className="inline-flex items-center gap-1.5 text-sm px-5 py-2 rounded-xl bg-accent text-white font-medium hover:bg-accent-hover transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            确认映射 →
          </button>
        </div>
      </div>
    </div>
  );
}
