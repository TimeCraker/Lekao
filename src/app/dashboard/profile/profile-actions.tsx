"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckIcon } from "@/components/icons";

/**
 * Profile 操作区 (客户端组件)
 * 修改用户名 → PATCH /api/auth/me（只 UPDATE users.name）→ session.update() 刷新 JWT
 */
const NAME_MAX = 40;

export function ProfileActions({ currentName }: { currentName: string }) {
  const { update: updateSession } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [status, setStatus] = useState<"saving" | "saved">();
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || status === "saving") return;

    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        name?: string;
        user?: { name?: string | null };
      };
      if (!res.ok) {
        setError(data.error ?? `保存失败（HTTP ${res.status}）`);
        setStatus(undefined);
        return;
      }
      // 刷新 JWT 里的 name（jwt callback trigger=update 重查 DB）
      await updateSession();
      // 刷新 server component（页面上方大名字来自 DB 查询，不 refresh 不会变）
      router.refresh();
      setName(data.user?.name ?? data.name ?? trimmed);
      setStatus("saved");
      setTimeout(() => {
        setStatus(undefined);
        setOpen(false);
      }, 1200);
    } catch {
      setError("网络错误，请重试");
      setStatus(undefined);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setName(currentName);
    setStatus(undefined);
    setError(null);
  };

  return (
    <div className="mt-6 pt-6 border-t border-hairline">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-block py-1 text-sm text-accent-text hover:text-accent-hover font-medium transition"
        >
          修改用户名 →
        </button>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm text-ink-muted">
            新用户名
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入新用户名"
              maxLength={NAME_MAX}
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
              <span className="inline-flex items-center gap-1 text-success-text text-sm">
                <CheckIcon className="w-3.5 h-3.5" />
                已保存
              </span>
            )}
          </div>
          {error && (
            <p className="text-xs text-danger-text" role="alert">
              {error}
            </p>
          )}
          <p className="text-xs text-ink-subtle">保存后会自动刷新登录状态</p>
        </div>
      )}
    </div>
  );
}
