import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { FeatureCards } from "@/components/landing/feature-cards";
import { Stats } from "@/components/landing/stats";
import { Workflow } from "@/components/landing/workflow";
import { FAQ } from "@/components/landing/faq";
import { faqJsonLd } from "@/components/landing/faq-jsonld";
import { ScrollProgress } from "@/components/landing/scroll-progress";

// ⭐ 2026-06-22 收尾：landing 页专属 metadata
// 比 layout 更具体（追加行动召唤关键词）
export const metadata: Metadata = {
  title: { absolute: "Lekao Agent · AI 教学工作台" },
  description:
    "Lekao Agent 是给助教的 AI 教学工作台：上传表格和错题图片，自动生成全班 Word 错题本，也能生成课堂小结、作业反馈与周末错题表。",
};

// JSON-LD FAQ（让 Google 在搜索结果展示 FAQ 折叠块）
// ⚠️ 安全前提：faqJsonLd 来自 server-only 模块 faq-jsonld.ts（纯字面量，禁拼入任何用户输入）
const faqJsonLdString = JSON.stringify(faqJsonLd);

export default function HomePage() {
  return (
    <>
      <ScrollProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLdString }}
      />
      <Hero />
      <FeatureCards />
      <Stats />
      <Workflow />
      <FAQ />
    </>
  );
}
