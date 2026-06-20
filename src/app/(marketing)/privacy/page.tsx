import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策 · Lekao Agent",
  description: "Lekao Agent 隐私政策 — 我们如何收集、使用和保护你的数据。",
};

const SECTIONS = [
  {
    title: "1. 我们收集什么",
    items: [
      "邮箱地址（用于登录与找回账号）",
      "你上传的作业图片 / Excel 文件（仅用于 AI 处理）",
      "AI 生成的课堂小结 / 反馈（保存在你的账号下，方便后续查看）",
      "T-Coin 余额与扣费记录（仅用于服务计费）",
    ],
  },
  {
    title: "2. 我们不收集什么",
    items: [
      "不收集你的姓名 / 手机号 / 通讯录 / 位置信息",
      "不收集设备指纹 / 广告 ID",
      "不收集 Cookie（除登录会话必需的 next-auth session token）",
      "不向任何第三方出售或共享你的数据",
    ],
  },
  {
    title: "3. 数据怎么用",
    items: [
      "邮箱：仅用于登录验证与发送验证码，不发送营销邮件",
      "上传内容：仅用于本次 AI 生成，处理完成后保留 30 天便于回溯，之后自动删除",
      "AI 输出：保存在数据库中，仅你的账号可见",
      "T-Coin 流水：永久保留，用于财务对账",
    ],
  },
  {
    title: "4. 第三方服务",
    items: [
      "AI 推理：使用 SiliconFlow / DeepSeek（OpenAI-compatible 接口），你的内容传输给模型供应商处理",
      "邮件发送：使用 SMTP 服务商发送验证码，不包含任何营销内容",
      "数据库：部署在腾讯云 PostgreSQL 实例，加密存储",
      "代码托管：使用 GitHub 私有仓库，仓库不含用户数据",
    ],
  },
  {
    title: "5. 你的权利",
    items: [
      "导出：随时可以在 /dashboard 下载你所有的 AI 输出记录",
      "删除：可以申请删除账号与全部数据，删除后 30 天内从生产环境清除",
      "更正：邮箱错误可以联系客服修正",
      "申诉：如有疑问可发送邮件至 hello@lekao.asterforge.top",
    ],
  },
  {
    title: "6. Cookie 与会话",
    items: [
      "Lekao 仅使用 next-auth 必需的 session cookie，用于保持登录状态",
      "不部署任何第三方追踪脚本（无 Google Analytics / 百度统计 / Sentry 等）",
      "退出登录后 cookie 立即失效",
    ],
  },
  {
    title: "7. 政策更新",
    items: [
      "如有重大变更会在登录页面顶部公告",
      "继续使用即视为接受更新后的政策",
      "本文档最后更新于 2026-06-20",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="bg-canvas">
      {/* Hero */}
      <section className="px-6 py-20 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent-soft border border-accent-line rounded-full text-sm text-accent-ink font-medium mb-6">
            隐私政策
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-ink tracking-tight">
            你的数据，由你掌控
          </h1>
          <p className="mt-6 text-lg text-ink-muted leading-relaxed">
            我们坚持数据最小化原则，只收集服务必需的字段，不追踪、不出售。
          </p>
          <p className="mt-4 text-sm text-ink-subtle">
            最后更新：2026-06-20
          </p>
        </div>
      </section>

      {/* 内容 */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto space-y-8">
          {SECTIONS.map((s) => (
            <div
              key={s.title}
              className="bg-white border border-hairline rounded-2xl p-6 md:p-8"
            >
              <h2 className="text-xl font-semibold text-ink mb-4">
                {s.title}
              </h2>
              <ul className="space-y-2.5">
                {s.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-ink-muted leading-relaxed"
                  >
                    <span className="text-accent-text shrink-0 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* 联系 */}
          <div className="bg-accent-soft border border-accent-line rounded-2xl p-6 md:p-8 text-center">
            <p className="text-ink font-medium mb-2">有隐私相关问题？</p>
            <p className="text-sm text-ink-muted">
              发送邮件至{" "}
              <a
                href="mailto:hello@lekao.asterforge.top"
                className="text-accent-text font-medium hover:underline"
              >
                hello@lekao.asterforge.top
              </a>
              ，我们会在 3 个工作日内回复
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}