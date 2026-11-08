"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { EASE_PUBLICATION } from "@/lib/motion-tokens";
import {
  MistakeIcon,
  SummaryIcon,
  FeedbackIcon,
  FreeIcon,
  CoinIcon,
} from "@/components/icons";
import { PageHeader } from "./page-header";
import { Reveal } from "./reveal";

const FEATURES = [
  {
    Icon: MistakeIcon,
    imageUrl: "/images/feature-mistake.png",
    imageAlt: "AI 整理错题集文档示意图",
    title: "错题集生成",
    description:
      "Excel 上传 + 拖拽图片，自动生成全班的错题 Word 文档，不用再手动誊抄",
    priceTag: { type: "free" as const, label: "免费" },
    href: "/dashboard/mistake",
  },
  {
    Icon: SummaryIcon,
    imageUrl: "/images/feature-summary.png",
    imageAlt: "结构化课堂小结文档示意图",
    title: "课堂小结",
    description: "AI 按固定格式生成小结和建议，一键复制，告别熬夜整理",
    priceTag: { type: "coin" as const, label: "1 币/次" },
    href: "/dashboard/summary",
  },
  {
    Icon: FeedbackIcon,
    imageUrl: "/images/feature-feedback.png",
    imageAlt: "AI 作业批改反馈示意图",
    title: "作业/堂测反馈",
    description:
      "上传讲义图片，AI 生成作业/堂测批改反馈，给出具体可执行的错题订正建议",
    priceTag: { type: "coin" as const, label: "1 币/次" },
    href: "/dashboard/feedback",
  },
];

export function FeatureCards() {
  return (
    <section
      id="features"
      className="cv-auto relative py-24 px-6 md:px-12 bg-canvas"
    >
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <PageHeader
            index="01"
            kicker="Features"
            title="三大核心功能"
            subtitle="把重复的整理交给 AI，你专注教学本身。"
          />
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={i} {...feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  Icon,
  imageUrl,
  imageAlt,
  title,
  description,
  priceTag,
  href,
  index,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  imageUrl: string;
  imageAlt: string;
  title: string;
  description: string;
  priceTag: { type: "free" | "coin"; label: string };
  href: string;
  index: number;
}) {
  return (
    <motion.a
      href={href}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.6,
        delay: index * 0.12,
        ease: EASE_PUBLICATION,
      }}
      whileHover={{ scale: 1.02 }}
      className="group block bg-white border border-hairline rounded-2xl overflow-hidden transition-colors duration-300 hover:border-accent hover:shadow-card-hover"
    >
      <div className="relative aspect-[3/2] bg-canvas-alt overflow-hidden">
        <Image
          src={imageUrl}
          alt={imageAlt}
          width={1024}
          height={682}
          sizes="(min-width: 768px) 33vw, 100vw"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute bottom-3 left-3 w-10 h-10 rounded-lg bg-white/90 backdrop-blur-sm text-accent-text flex items-center justify-center shadow-sm">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="p-7">
        <h3 className="font-serif text-2xl font-semibold text-ink mb-2 group-hover:text-accent-ink transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm text-ink-muted leading-relaxed mb-6 min-h-[3rem]">
          {description}
        </p>
        <div className="flex items-center justify-between">
          <PriceTag type={priceTag.type} label={priceTag.label} />
          <span className="text-accent text-sm font-medium opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 font-mono uppercase tracking-wider text-xs">
            了解 →
          </span>
        </div>
      </div>
    </motion.a>
  );
}

function PriceTag({ type, label }: { type: "free" | "coin"; label: string }) {
  if (type === "free") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-success-soft text-success-text text-xs font-semibold rounded-full font-mono uppercase tracking-wider">
        <FreeIcon className="w-3 h-3" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent-soft text-accent-ink text-xs font-semibold rounded-full font-mono uppercase tracking-wider">
      <CoinIcon className="w-3 h-3" />
      {label}
    </span>
  );
}
