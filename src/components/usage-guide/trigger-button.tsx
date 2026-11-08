"use client";

/**
 * "使用说明" 触发按钮 + Modal 容器
 *
 * 用法：每个 dashboard 页面 <UsageGuideButton module="summary" /> 单击即可
 *
 * 内容（title/subtitle/sections）在客户端按 module key 查找，
 * 避免 server→client 透传 function 引用（RSC 错误）
 */

import { useState } from "react";
import { HelpIcon } from "@/components/icons";
import { UsageGuideModal } from "./modal";
import { MISTAKE_GUIDE, SUMMARY_GUIDE, FEEDBACK_GUIDE } from "./content";

export type UsageModule = "mistake" | "summary" | "feedback";

const GUIDES = {
  mistake: MISTAKE_GUIDE,
  summary: SUMMARY_GUIDE,
  feedback: FEEDBACK_GUIDE,
} as const;

type Props = {
  module: UsageModule;
  /** 可选：按钮文案，默认"使用说明" */
  label?: string;
};

export function UsageGuideButton({ module, label = "使用说明" }: Props) {
  const [open, setOpen] = useState(false);
  const guide = GUIDES[module];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-ink-mute hover:text-ink hover:bg-white border border-transparent hover:border-hairline rounded-lg transition"
      >
        <HelpIcon className="w-[16px] h-[16px]" />
        {label}
      </button>

      <UsageGuideModal
        open={open}
        onClose={() => setOpen(false)}
        title={guide.title}
        subtitle={guide.subtitle}
        sections={guide.sections}
      />
    </>
  );
}
