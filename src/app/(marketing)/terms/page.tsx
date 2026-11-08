import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "服务条款",
  description: "Lekao Agent 服务条款 — 使用本服务前请阅读。",
};

const SECTIONS = [
  {
    title: "1. 服务内容",
    items: [
      "Lekao Agent 提供 AI 驱动的助教辅助工具，包括错题集生成、课堂小结、课堂反馈三大功能",
      "新用户赠送试用额度，每日签到可领 T-Coin 持续使用",
      "本服务为软件工具，AI 生成内容仅供助教参考，最终发布前需人工核对",
    ],
  },
  {
    title: "2. T-Coin 规则",
    items: [
      "课堂小结、课堂反馈每次生成消耗 1 枚 T-Coin（AI 生成失败自动退回，不扣费）",
      "扣费顺序：先扣赠送 T-Coin → 再扣加赠 T-Coin",
      "赠送的试用额度用完不再补发，每日签到可领币（连续签到奖励更多）",
      "T-Coin 不可转让、不可兑现、不可退款",
    ],
  },
  {
    title: "3. T-Coin 获取",
    items: [
      "注册赠送 5 枚 T-Coin（一次性）",
      "每日签到可领币，连续签到奖励递增（控制台主页 → 每日签到）",
      "错题集 Word 生成完全免费，不消耗 T-Coin",
    ],
  },
  {
    title: "4. 用户行为规范",
    items: [
      "不得使用本服务生成违反国家法律法规的内容",
      "不得上传包含他人隐私（学生个人信息 / 家长联系方式）的图片",
      "不得利用本服务批量爬取、攻击、干扰服务正常运行",
      "不得转售账号或 T-Coin",
      "不得伪造 AI 输出用于欺诈、学术造假等不当用途",
    ],
  },
  {
    title: "5. AI 内容免责声明",
    items: [
      "Lekao Agent 输出由 AI 模型生成，可能存在事实错误、表达偏差",
      "用户应自行核对 AI 生成内容的准确性，再用于发布",
      "因 AI 输出错误导致的任何后果，开发者不承担法律责任",
      "本服务不替代教师的职业判断",
    ],
  },
  {
    title: "6. 知识产权",
    items: [
      "你上传的内容归你所有，我们仅在服务期间使用",
      "AI 生成的内容归你所有",
      "Lekao Agent 的代码、设计、品牌归开发者所有",
      "未经允许不得复制、修改、再分发本服务",
    ],
  },
  {
    title: "7. 服务变更与终止",
    items: [
      "我们保留随时修改、暂停或终止服务的权利",
      "如服务终止，将提前 30 天公告",
      "因不可抗力导致的服务中断，不承担赔偿责任",
    ],
  },
  {
    title: "8. 争议解决",
    items: [
      "本条款适用中华人民共和国法律",
      "如发生争议，应先友好协商；协商不成的，提交开发者所在地有管辖权的法院解决",
      "本文档最后更新于 2026-08-18",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="bg-canvas">
      {/* Hero */}
      <section className="px-6 py-20 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent-soft border border-accent-line rounded-full text-sm text-accent-ink font-medium mb-6">
            服务条款
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-ink tracking-tight">
            使用前请阅读
          </h1>
          <p className="mt-6 text-lg text-ink-muted leading-relaxed">
            本条款约定你与 Lekao Agent 之间的权利与义务。
            <br />
            注册账号即视为同意本条款全部内容。
          </p>
          <p className="mt-4 text-sm text-ink-subtle">最后更新：2026-08-18</p>
        </div>
      </section>

      {/* 内容 */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto space-y-6">
          {SECTIONS.map((s) => (
            <div
              key={s.title}
              className="bg-white border border-hairline rounded-2xl p-6 md:p-8"
            >
              <h2 className="font-serif text-xl font-semibold text-ink mb-4">
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
          <div className="bg-page-dark rounded-2xl p-6 md:p-8 text-center">
            <p className="text-ink-on-dark font-medium mb-2">
              使用过程中遇到问题？
            </p>
            <p className="text-sm text-ink-on-dark-muted">
              联系开发者{" "}
              <a
                href="https://asterforge.top/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white font-medium hover:underline"
              >
                asterforge.top ↗
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
