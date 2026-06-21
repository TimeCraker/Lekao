"use client";

import { motion } from "motion/react";
import {
  MistakeIcon,
  SummaryIcon,
  FeedbackIcon,
  FreeIcon,
  CoinIcon,
} from "@/components/icons";

const FEATURES = [
  {
    Icon: MistakeIcon,
    title: "错题集生成",
    description:
      "Excel 上传 + 拖拽图片 = 5 分钟出全班的错题 Word 文档，拒绝手动誊抄",
    priceTag: { type: "free" as const, label: "免费" },
    href: "/dashboard/mistake",
  },
  {
    Icon: SummaryIcon,
    title: "课堂小结",
    description:
      "AI 按 BRD 硬约束格式生成 10 条建议 + 小结，一键复制，告别熬夜整理",
    priceTag: { type: "coin" as const, label: "1 币/次" },
    href: "/dashboard/summary",
  },
  {
    Icon: FeedbackIcon,
    title: "作业/堂测反馈",
    description:
      "上传讲义图片，AI 生成作业/堂测批改反馈，给出具体可执行的错题订正建议",
    priceTag: { type: "coin" as const, label: "1 币/次" },
    href: "/dashboard/feedback",
  },
];

export function FeatureCards() {
  return (
    <section id="features" className="relative py-24 px-6 bg-canvas">
      <div className="max-w-6xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4">
            三大核心功能
          </h2>
          <p className="text-lg text-ink-muted">
            AI 接管重复工作，让你专注真正重要的事
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={i} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  Icon,
  title,
  description,
  priceTag,
  href,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  priceTag: { type: "free" | "coin"; label: string };
  href: string;
}) {
  return (
    <motion.a
      href={href}
      className="group block bg-white border border-hairline rounded-2xl p-8 transition-all duration-300 hover:border-accent hover:shadow-card-hover hover:-translate-y-1"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="w-14 h-14 mb-5 rounded-xl bg-accent-soft text-accent-text flex items-center justify-center group-hover:scale-105 transition-transform">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-semibold text-ink mb-2">{title}</h3>
      <p className="text-sm text-ink-muted leading-relaxed mb-6 min-h-[3rem]">
        {description}
      </p>
      <div className="flex items-center justify-between">
        <PriceTag type={priceTag.type} label={priceTag.label} />
        <span className="text-accent text-sm font-medium opacity-0 group-hover:opacity-100 transition">
          了解 →
        </span>
      </div>
    </motion.a>
  );
}

function PriceTag({
  type,
  label,
}: {
  type: "free" | "coin";
  label: string;
}) {
  if (type === "free") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-success-soft text-success-text text-xs font-semibold rounded-full">
        <FreeIcon className="w-3 h-3" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent-soft text-accent-ink text-xs font-semibold rounded-full">
      <CoinIcon className="w-3 h-3" />
      {label}
    </span>
  );
}
