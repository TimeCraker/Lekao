"use client";

// ============================================
// Lekao · 模板选择器 + 管理弹窗（2026-08-18 · Stage B）
// ============================================
// - 下拉：平台预设（标准/简洁）+ 我的模板（每类最多 5 个）
// - 「管理」弹窗：列表（使用/删除）+ 新建表单（结构化字段，非裸 prompt）
// - 选中变化时把 style 对象抛给父组件（父组件用于页面可见 prompt 一致展示）
// - DB 模板被删/非法 → 自动回退 standard

import { useCallback, useEffect, useState } from "react";
import { useDialogA11y } from "@/lib/hooks/dialog-a11y";
import { motion, AnimatePresence } from "motion/react";
import { useReducedMotion } from "@/lib/hooks/motion";
import { CloseIcon, AddIcon } from "@/components/icons";
import {
  PRESET_TEMPLATES,
  TEMPLATE_LIMITS,
  TEMPLATE_TONES,
  type LekaoTemplateType,
  type TemplateStyle,
  type TemplateTone,
} from "@/lib/templates";

type MyTemplate = {
  id: string;
  name: string;
  type: LekaoTemplateType;
  style: TemplateStyle;
};

type Props = {
  template: LekaoTemplateType;
  value: string;
  onChange: (id: string, style: TemplateStyle | undefined) => void;
  disabled?: boolean;
};

function presetStyleOf(id: string): TemplateStyle | undefined {
  return PRESET_TEMPLATES.find((p) => p.id === id)?.style;
}

export function TemplatePicker({ template, value, onChange, disabled }: Props) {
  const [mine, setMine] = useState<MyTemplate[]>([]);
  const [managerOpen, setManagerOpen] = useState(false);

  const loadMine = useCallback(async () => {
    try {
      const res = await fetch(`/api/lekao/templates?type=${template}`);
      if (!res.ok) return;
      const data = (await res.json()) as { mine: MyTemplate[] };
      setMine(data.mine ?? []);
      // 当前选中被删（不在 mine 里且非 preset）→ 回退 standard
      if (
        value !== "standard" &&
        value !== "concise" &&
        !(data.mine ?? []).some((m) => m.id === value)
      ) {
        onChange("standard", undefined);
      }
    } catch {
      // 网络失败静默：下拉仍有预设可用
    }
  }, [template, value, onChange]);

  useEffect(() => {
    // setTimeout 调度：fetch 回调里 setState（effect body 不同步 setState）
    const t = setTimeout(loadMine, 0);
    return () => clearTimeout(t);
    // 仅按 template 类型加载（value/onChange 变化不重复请求）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const handleChange = (id: string) => {
    if (id === "standard" || id === "concise") {
      onChange(id, presetStyleOf(id));
      return;
    }
    const found = mine.find((m) => m.id === id);
    if (found) onChange(id, found.style);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs sm:text-sm text-ink-muted font-medium">
        模板
      </label>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        aria-label="选择生成模板"
        className="px-3 py-2 border border-hairline rounded-lg text-sm text-ink bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition disabled:opacity-50 max-w-[10rem] sm:max-w-none"
      >
        <optgroup label="预设">
          {PRESET_TEMPLATES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="我的模板">
          {mine.length === 0 ? (
            <option disabled>暂无（点「管理」创建）</option>
          ) : (
            mine.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))
          )}
        </optgroup>
      </select>
      <button
        type="button"
        onClick={() => setManagerOpen(true)}
        disabled={disabled}
        className="px-3 py-2 border border-hairline rounded-lg text-xs sm:text-sm text-ink-muted hover:text-ink hover:bg-canvas-alt transition disabled:opacity-50"
      >
        管理
      </button>

      <AnimatePresence>
        {managerOpen && (
          <TemplateManagerModal
            template={template}
            mine={mine}
            onClose={() => setManagerOpen(false)}
            onChanged={loadMine}
            onUse={(id) => {
              handleChange(id);
              setManagerOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================
 * 管理弹窗：列表（使用/删除）+ 新建表单
 * ============================================ */

type ModalProps = {
  template: LekaoTemplateType;
  mine: MyTemplate[];
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onUse: (id: string) => void;
};

function TemplateManagerModal({
  template,
  mine,
  onClose,
  onChanged,
  onUse,
}: ModalProps) {
  const reduced = useReducedMotion();
  const typeLabel = template === "summary" ? "课堂小结" : "作业/堂测反馈";

  const [formOpen, setFormOpen] = useState(mine.length === 0);
  const [name, setName] = useState("");
  const [greeting, setGreeting] = useState("");
  const [tone, setTone] = useState<TemplateTone | "">("");
  const [signature, setSignature] = useState("");
  const [extraNote, setExtraNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useDialogA11y({ open: true, onClose });

  const resetForm = () => {
    setName("");
    setGreeting("");
    setTone("");
    setSignature("");
    setExtraNote("");
    setError("");
  };

  const handleCreate = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/lekao/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: template,
          greeting,
          tone,
          signature,
          extraNote,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        template?: { id: string };
      };
      if (!res.ok) {
        setError(data.error ?? "保存失败，请重试");
        return;
      }
      resetForm();
      setFormOpen(false);
      await onChanged();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/lekao/templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "删除失败");
        return;
      }
      await onChanged();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 border border-hairline rounded-lg text-sm text-ink bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.15 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="管理生成模板"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="bg-white border border-hairline rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto focus:outline-none"
        tabIndex={-1}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-serif text-lg font-semibold text-ink">
              我的模板
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              用于「{typeLabel}」 · 最多 {TEMPLATE_LIMITS.maxPerUserType} 个
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-mute hover:bg-canvas-alt transition"
          >
            <CloseIcon className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 列表 */}
          {mine.length > 0 && (
            <ul className="space-y-2">
              {mine.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 px-3 py-2.5 border border-hairline rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">
                      {m.name}
                    </p>
                    <p className="text-xs text-ink-muted truncate">
                      {styleSummary(m.style)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUse(m.id)}
                    className="px-2.5 py-1.5 text-xs font-medium text-accent-ink bg-accent-soft rounded-lg hover:bg-accent/15 transition shrink-0"
                  >
                    使用
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    disabled={busy}
                    className="px-2.5 py-1.5 text-xs text-danger hover:bg-danger/10 rounded-lg transition shrink-0 disabled:opacity-50"
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* 新建表单开关 */}
          {!formOpen && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 border border-dashed border-hairline rounded-lg text-sm text-ink-muted hover:text-accent-text hover:border-accent/40 transition"
            >
              <AddIcon className="w-4 h-4" />
              新建模板
            </button>
          )}

          {/* 新建表单 */}
          {formOpen && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs text-ink-muted font-medium">
                  模板名称 *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`如「家长群${template === "summary" ? "小结" : "反馈"}」`}
                  maxLength={TEMPLATE_LIMITS.nameMax}
                  className={inputCls + " mt-1"}
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted font-medium">
                  开头称呼（可选）
                </label>
                <input
                  type="text"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder="如「各位家长：」"
                  maxLength={TEMPLATE_LIMITS.greetingMax}
                  className={inputCls + " mt-1"}
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted font-medium">
                  语气（可选）
                </label>
                <div className="flex rounded-lg border border-hairline overflow-hidden mt-1">
                  {TEMPLATE_TONES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      title={t.desc}
                      onClick={() => setTone(tone === t.value ? "" : t.value)}
                      className={
                        "flex-1 px-2 py-2 text-xs sm:text-sm font-medium transition-colors border-r last:border-r-0 border-hairline " +
                        (tone === t.value
                          ? "bg-accent text-white"
                          : "bg-white text-ink-muted hover:text-ink hover:bg-canvas-alt")
                      }
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-muted font-medium">
                  结尾签名（可选）
                </label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="如「——李老师」"
                  maxLength={TEMPLATE_LIMITS.signatureMax}
                  className={inputCls + " mt-1"}
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted font-medium">
                  附加要求（可选）
                </label>
                <textarea
                  value={extraNote}
                  onChange={(e) => setExtraNote(e.target.value)}
                  placeholder="一句话要求，如「多提具体题目编号」"
                  maxLength={TEMPLATE_LIMITS.extraNoteMax}
                  rows={2}
                  className={inputCls + " mt-1 resize-none"}
                />
              </div>

              {error && (
                <p className="text-xs text-danger" role="alert">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={busy || !name.trim()}
                  className="flex-1 px-3 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-strong transition disabled:opacity-50"
                >
                  {busy ? "保存中…" : "保存模板"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setFormOpen(false);
                  }}
                  disabled={busy}
                  className="px-3 py-2.5 text-sm text-ink-muted hover:text-ink transition disabled:opacity-50"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** 列表项的风格摘要（一行内说清这个模板改了什么） */
function styleSummary(style: TemplateStyle): string {
  const parts: string[] = [];
  if (style.greeting) parts.push(`称呼「${style.greeting}」`);
  if (style.tone)
    parts.push(
      TEMPLATE_TONES.find((t) => t.value === style.tone)?.label + "语气",
    );
  if (style.signature) parts.push(`签名「${style.signature}」`);
  if (style.extraNote) parts.push("附加要求");
  return parts.length > 0 ? parts.join(" · ") : "（空模板）";
}
