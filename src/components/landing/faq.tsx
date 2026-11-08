"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { EASE_PUBLICATION } from "@/lib/motion-tokens";
import { PageHeader } from "./page-header";

const FAQS = [
  {
    q: "Lekao Agent 适合什么人群使用？",
    a: "主要面向 K12 培训机构助教 / 学管 / 班主任，以及需要为班级整理课堂小结和作业反馈的老师。小学到高中全学段通用，9 个学科全覆盖（数学、物理、化学、生物、英语、语文、地理、历史、政治）。",
  },
  {
    q: "AI 生成的课堂小结和反馈质量如何？",
    a: "Lekao Agent 使用 DeepSeek-V4-Flash 文本模型 + Qwen3-VL-8B 视觉模型，能自动识别讲义图片中的学科、章节、知识点，按固定格式输出（如「本次数学作业反馈（函数与导数）」+ 20 条反馈 + 一段 150-300 字小结）。所有 prompt 在页面公开可复制，用户可自行调整。",
  },
  {
    q: "T-Coin 是什么？怎么获取？",
    a: "T-Coin 是 Lekao Agent 的使用积分。每生成一次课堂小结或作业反馈消耗 1 枚 T-Coin。注册赠送 5 枚，之后每日签到可领币（连续签到奖励更多）；错题集 Word 文档生成完全免费不消耗 T-Coin。",
  },
  {
    q: "错题集生成是免费的吗？",
    a: "是的，错题集生成永久免费，不消耗 T-Coin。Excel 模板 + 拖拽题目图片 + 5 分钟生成全班 Word 错题文档。",
  },
  {
    q: "讲义图片会被保存吗？隐私如何保护？",
    a: "讲义图片仅在用户主动生成时上传到 AI 服务，生成后不保存到 Lekao Agent 数据库（流式返回结果，本地 IndexedDB 存历史记录）。所有生成历史支持用户主动清除。",
  },
  {
    q: "支持手机端吗？",
    a: "支持。Lekao Agent 适配移动端浏览器（响应式设计），但建议 PC 端使用以获得最佳体验（错题集 Word 编辑、图片批量上传在 PC 端更高效）。",
  },
];

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="cv-auto relative py-24 px-6 md:px-12 bg-canvas-alt">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          index="04"
          kicker="FAQ"
          title="常见问题"
          subtitle="关于 Lekao Agent 你可能想知道的。"
        />

        <div className="space-y-3 mt-10">
          {FAQS.map((faq, i) => {
            const isOpen = openIdx === i;
            const num = String(i + 1).padStart(2, "0");
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="bg-white border border-hairline rounded-2xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-canvas-alt transition"
                  aria-expanded={isOpen}
                >
                  <span className="flex items-baseline gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-subtle">
                      Q{num}
                    </span>
                    <span className="font-serif text-lg font-semibold text-ink">
                      {faq.q}
                    </span>
                  </span>
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full border border-hairline flex items-center justify-center text-ink-muted transition-transform ${
                      isOpen
                        ? "rotate-45 bg-accent border-accent text-white"
                        : ""
                    }`}
                    aria-hidden
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M6 1V11M1 6H11"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </button>
                {/* 2026-09-29 补 AnimatePresence：exit 原先永不播放，关闭瞬变（§12.2 瞬变清单修复） */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: EASE_PUBLICATION }}
                      className="px-6 pb-5 pl-[4.25rem] text-sm text-ink-muted leading-relaxed overflow-hidden"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ⭐ JSON-LD FAQ schema 已移到 ./faq-jsonld.ts（避免 client component export 限制）
