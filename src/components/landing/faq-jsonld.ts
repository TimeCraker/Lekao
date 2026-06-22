// ============================================
// FAQ JSON-LD Schema（server-only module）
// ============================================
// ⚠️ 必须保持 server-only（无 "use client"），因为 server component 在 prerender 时
//    会内联 JSON.stringify() 到 <script dangerouslySetInnerHTML>
//    client component 不能 export 给 server component 消费
//
// 数据来源：faq.tsx 的 FAQS 数组（手动保持同步）
// 安全前提：纯字面量，禁拼入任何用户输入

export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "LeKao 适合什么人群使用？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "主要面向 K12 培训机构助教 / 学管 / 班主任，以及需要为班级整理课堂小结和作业反馈的老师。小学到高中全学段通用，9 个学科全覆盖（数学、物理、化学、生物、英语、语文、地理、历史、政治）。",
      },
    },
    {
      "@type": "Question",
      name: "AI 生成的课堂小结和反馈质量如何？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "LeKao 使用 DeepSeek-V4-Flash 文本模型 + Qwen3-VL-8B 视觉模型，能自动识别讲义图片中的学科、章节、知识点，按 BRD 硬约束格式输出（如「本次数学作业反馈（函数与导数）」+ 20 条反馈 + 一段 150-300 字小结）。所有 prompt 在页面公开可复制，用户可自行调整。",
      },
    },
    {
      "@type": "Question",
      name: "T-Coin 是什么？怎么获取？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "T-Coin 是 LeKao 的使用积分。每生成一次课堂小结或作业反馈消耗 1 枚 T-Coin。注册即送 5 枚（够生成 5 次），错题集 Word 文档生成完全免费不消耗 T-Coin。后续可关注正式商业化后的充值通道。",
      },
    },
    {
      "@type": "Question",
      name: "错题集生成是免费的吗？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "是的，错题集生成永久免费，不消耗 T-Coin。Excel 模板 + 拖拽题目图片 + 5 分钟生成全班 Word 错题文档。",
      },
    },
    {
      "@type": "Question",
      name: "讲义图片会被保存吗？隐私如何保护？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "讲义图片仅在用户主动生成时上传到 AI 服务，生成后不保存到 LeKao 数据库（流式返回结果，本地 IndexedDB 存历史记录）。所有生成历史支持用户主动清除。",
      },
    },
    {
      "@type": "Question",
      name: "支持手机端吗？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "支持。LeKao 适配移动端浏览器（响应式设计），但建议 PC 端使用以获得最佳体验（错题集 Word 编辑、图片批量上传在 PC 端更高效）。",
      },
    },
  ],
};
