"use client";

import { motion } from "motion/react";

const FEATURES = [
  {
    icon: "📋",
    title: "错题集生成",
    description: "Excel 上传 + 拖拽图片 = 5 分钟出全班的错题 Word 文档",
    priceTag: { type: "free" as const, label: "免费" },
    href: "/dashboard/mistake",
  },
  {
    icon: "📝",
    title: "课堂小结",
    description: "AI 按 BRD 硬约束格式生成 10 条建议 + 小结，一键复制",
    priceTag: { type: "coin" as const, label: "1 币/次" },
    href: "/dashboard/summary",
  },
  {
    icon: "💬",
    title: "课堂反馈",
    description: "上传讲义图片 + 简单描述，AI 生成专业家长反馈",
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
            让 AI 帮你完成重复工作，把时间留给学生
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
  icon,
  title,
  description,
  priceTag,
  href,
}: {
  icon: string;
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
      <div className="text-5xl mb-4">{icon}</div>
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
      <span className="inline-flex items-center px-2.5 py-1 bg-success/10 text-success text-xs font-semibold rounded-full">
        ✦ {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 bg-accent-soft text-accent-ink text-xs font-semibold rounded-full">
      🪙 {label}
    </span>
  );
}