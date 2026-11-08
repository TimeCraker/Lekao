"use client";

import { signOut } from "next-auth/react";
import { motion } from "motion/react";
import { EASE_PUBLICATION } from "@/lib/motion-tokens";
import { useReducedMotion } from "@/lib/hooks/motion";
import { CloseIcon } from "@/components/icons";
import { PressableButton } from "@/components/ui/pressable-button";

export default function BannedPage() {
  const reduced = useReducedMotion();
  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas-alt p-4">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE_PUBLICATION }}
        className="w-full max-w-md rounded-2xl border border-hairline bg-white p-8 text-center shadow-sm"
      >
        <motion.div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft anim-error-pulse">
          <CloseIcon className="h-6 w-6 text-danger-text" />
        </motion.div>
        <h1 className="text-xl font-semibold text-ink">账号已被封禁</h1>
        <p className="mt-3 text-sm text-ink-muted">
          你的账号因违反使用规范已被管理员封禁，无法继续使用 Lekao Agent。
          <br />
          如有疑问，请联系客服微信：
          <span className="font-medium text-ink">lekao_support</span>
        </p>
        <PressableButton
          variant="primary"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-6 w-full !bg-ink hover:!bg-ink/90"
        >
          返回首页
        </PressableButton>
      </motion.div>
    </main>
  );
}
