"use client";

import { useState } from "react";

/**
 * Profile 操作区 (客户端组件)
 * Phase 1: 显示"修改名"按钮 (placeholder, 不接 API)
 * Phase 2: 接 /api/auth/me PATCH 更新 name + 刷新 JWT
 */
export function ProfileActions({
  userId: _userId,
  currentName,
}: {
  userId: string;
  currentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

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
              className="mt-1.5 w-full px-4 py-2.5 bg-canvas border border-hairline rounded-lg text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent-text focus:ring-2 focus:ring-accent-line transition"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setStatus("saving");
                // Phase 2: 接 /api/auth/me PATCH + signIn refresh
                await new Promise((r) => setTimeout(r, 600));
                setStatus("idle");
                setOpen(false);
              }}
              disabled={status === "saving" || !name.trim()}
              className="px-4 py-2 bg-accent-text text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition"
            >
              {status === "saving" ? "保存中…" : "保存"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setName(currentName);
                setStatus("idle");
              }}
              className="px-4 py-2 text-ink-mute hover:text-ink text-sm transition"
            >
              取消
            </button>
            {status === "saved" && (
              <span className="text-success-text text-sm">✓ 已保存</span>
            )}
            {status === "error" && (
              <span className="text-danger text-sm">保存失败</span>
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
