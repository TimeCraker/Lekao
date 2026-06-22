"use client";

import { signOut } from "next-auth/react";
import { CloseIcon } from "@/components/icons";

export default function BannedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-alt p-4">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <CloseIcon className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-xl font-semibold text-ink">账号已被封禁</h1>
        <p className="mt-3 text-sm text-ink-muted">
          你的账号因违反使用规范已被管理员封禁，无法继续使用 Lekao。
          <br />
          如有疑问，请联系客服微信：<span className="font-medium text-ink">lekao_support</span>
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-6 w-full rounded-lg bg-ink py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          返回首页
        </button>
      </div>
    </div>
  );
}