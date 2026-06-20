"use client";

import { useState } from "react";

/**
 * Profile 操作区 (客户端组件)
 * Phase 1: 修改名 UI placeholder (不接 API)
 * Phase 2: 接 /api/auth/me PATCH 更新 name + signIn refresh JWT
 */
export function ProfileActions({ currentName }: { currentName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [status, setStatus] = useState<"saving" | "saved">();

  const handleSave = async () => {
    setStatus("saving");
    // Phase 2: 调 /api/auth/me PATCH → signIn refresh JWT
    await new Promise((r) => setTimeout(r, 600));
    setStatus("saved");
    setTimeout(() => {
      setStatus(undefined);
      setOpen(false);
      setName(currentName);
    }, 1200);
  };

  const handleCancel = () => {
    setOpen(false);
    setName(currentName);
    setStatus(undefined);
  };

  return (
    <div className="mt-6 pt-6 border-t border-hairline">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-accent-text hover:text-accent-hover font-medium transition"
        >
          修改用户名 →
        </button>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm text-ink-muted">
            新用户名
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入新用户名"
              disabled={status === "saving"}
              className="mt-1.5 w-full px-4 py-2.5 bg-canvas border border-hairline rounded-lg text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent-text focus:ring-2 focus:ring-accent-line disabled:opacity-60 transition"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={status === "saving" || !name.trim()}
              aria-busy={status === "saving"}
              className="px-4 py-2 bg-accent-text text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition"
            >
              {status === "saving" ? "保存中…" : "保存"}
            </button>
            <button
              onClick={handleCancel}
              disabled={status === "saving"}
              className="px-4 py-2 text-ink-mute hover:text-ink text-sm disabled:opacity-50 transition"
            >
              取消
            </button>
            {status === "saved" && (
              <span className="text-success-text text-sm">✓ 已保存</span>
            )}
          </div>
          <p className="text-xs text-ink-subtle">
            Phase 2 接入：保存后自动刷新 JWT
          </p>
        </div>
      )}
    </div>
  );
}
