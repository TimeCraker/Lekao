import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { FeatureCards } from "@/components/landing/feature-cards";
import { Stats } from "@/components/landing/stats";
import { FAQ } from "@/components/landing/faq";
import { faqJsonLd } from "@/components/landing/faq-jsonld";

// ⭐ 2026-06-22 收尾：landing 页专属 metadata
// 比 layout 更具体（追加行动召唤关键词）
export const metadata: Metadata = {
  title: "AI 智能助教 · 让助教从抄错题里解放出来",
  description:
    "LeKao 是 K12 培训机构的 AI 智能助教助手：自动生成课堂小结、作业反馈、错题集 Word。每节课省 1-2 小时，永久免费基础功能，注册即送 5 T-Coin。",
};

// JSON-LD FAQ（让 Google 在搜索结果展示 FAQ 折叠块）
// ⚠️ 安全前提：faqJsonLd 来自 server-only 模块 faq-jsonld.ts（纯字面量，禁拼入任何用户输入）
const faqJsonLdString = JSON.stringify(faqJsonLd);

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLdString }}
      />
      <Hero />
      <FeatureCards />
      <Stats />
      <FAQ />
    </>
  );
}
