"use client";

/**
 * Step 2.5 · 封面信息确认（v2 新增）
 *
 * 功能：
 * - 预筛选：从 Excel 提取的"班级"和"学科"作为默认值
 * - 用户可接受默认值 / 下拉选其他 / 手动改
 * - 学科：默认 = Sheet 名（datalist 列出所有 Sheet 名）
 * - 班级：默认 = Excel 标题行提取的 classroomName（datalist 列出其他 Sheet 提取的班级）
 * - 用户可手动填全新班级
 *
 * 改完后调 onConfirm 传 (subjectName, classroomName) → workflow 进 fillSlots
 */

import { useMemo } from "react";
import * as XLSX from "xlsx";
import { extractHeaderInfo, listSheets } from "@/lib/mistake/excel-parser";
import type { MistakeCollection } from "@/lib/mistake/types";

export interface ConfirmCoverValue {
  subjectName: string; // 学科（= 哪个 Sheet）
  classroomName: string; // 班级
}

export interface ConfirmCoverProps {
  collection: MistakeCollection;
  workbook: XLSX.WorkBook;
  value: ConfirmCoverValue;
  onChange: (value: ConfirmCoverValue) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export function ConfirmCover({
  collection,
  workbook,
  value,
  onChange,
  onConfirm,
  onBack,
}: ConfirmCoverProps) {
  // 计算所有 Sheet 的班级名（用于班级 datalist）
  const allClassroomOptions = useMemo(() => {
    const allSheets = listSheets(workbook);
    const classrooms = new Set<string>();
    for (const sheet of allSheets) {
      try {
        const { classroomName } = extractHeaderInfo(workbook, sheet.name);
        if (classroomName && classroomName !== sheet.name) {
          classrooms.add(classroomName);
        }
      } catch {
        // 跳过无法解析的 Sheet
      }
    }
    // 当前 collection 的班级也加入
    if (collection.classroomName) {
      classrooms.add(collection.classroomName);
    }
    return Array.from(classrooms).sort();
  }, [workbook, collection.classroomName]);

  // 计算所有 Sheet 名（用于学科 datalist）
  const allSubjectOptions = useMemo(() => {
    return listSheets(workbook).map((s) => s.name);
  }, [workbook]);

  return (
    <div className="space-y-6">
      {/* 说明 */}
      <div className="rounded-xl border border-accent-line bg-accent-soft/30 p-4">
        <div className="text-sm text-accent-ink">
          💡 预筛选已从 Excel 自动提取。可下拉选其他选项，也可手动改。
        </div>
      </div>

      {/* 学科字段 */}
      <div>
        <label
          htmlFor="subject-input"
          className="block text-sm font-medium text-ink mb-2"
        >
          学科 <span className="text-ink-subtle">（用作 Word 页眉"科目"）</span>
        </label>
        <input
          id="subject-input"
          type="text"
          list="subject-options"
          value={value.subjectName}
          onChange={(e) =>
            onChange({ ...value, subjectName: e.target.value })
          }
          placeholder="如：化学 / 物理 / 数学"
          className="w-full px-4 py-2.5 rounded-lg border border-hairline bg-white text-ink focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition"
        />
        <datalist id="subject-options">
          {allSubjectOptions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <div className="mt-1.5 text-xs text-ink-subtle">
          默认 = 当前 Sheet 名 "{collection.sheetName}"，可下拉选其他 Sheet 或手动改
        </div>
      </div>

      {/* 班级字段 */}
      <div>
        <label
          htmlFor="classroom-input"
          className="block text-sm font-medium text-ink mb-2"
        >
          班级 <span className="text-ink-subtle">（用作 Word 封面"班级：xxx"）</span>
        </label>
        <input
          id="classroom-input"
          type="text"
          list="classroom-options"
          value={value.classroomName}
          onChange={(e) =>
            onChange({ ...value, classroomName: e.target.value })
          }
          placeholder="如：理科精品班"
          className="w-full px-4 py-2.5 rounded-lg border border-hairline bg-white text-ink focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition"
        />
        <datalist id="classroom-options">
          {allClassroomOptions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="mt-1.5 text-xs text-ink-subtle">
          默认 = Excel 标题行提取的 "{collection.classroomName}"，可下拉选其他班级或手动改
        </div>
      </div>

      {/* 预览 */}
      <div className="rounded-xl border border-hairline bg-canvas-alt/30 p-4">
        <div className="text-xs text-ink-subtle mb-2">Word 封面预览</div>
        <div className="space-y-1 text-sm text-ink">
          <div className="text-center font-bold text-lg">错题集</div>
          <div className="text-center">姓名：{`(学生名)`}</div>
          <div className="text-center">班级：{value.classroomName || "(空)"}</div>
        </div>
        <div className="mt-3 pt-3 border-t border-hairline text-xs text-ink-subtle">
          页眉预览：科目 = {value.subjectName || "(空)"}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg text-ink-muted hover:text-ink hover:bg-canvas-alt transition"
        >
          ← 返回选 Sheet
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!value.subjectName.trim() || !value.classroomName.trim()}
          className="px-6 py-2.5 rounded-lg bg-accent-text text-white font-medium hover:bg-accent-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一步 · 开始填题号 →
        </button>
      </div>
    </div>
  );
}
