import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "服务条款 · Lekao Agent",
  description: "Lekao Agent 服务条款 — 使用本服务前请阅读。",
};

const SECTIONS = [
  {
    title: "1. 服务内容",
    items: [
      "Lekao Agent 提供 AI 驱动的培训机构助教辅助工具，包括错题集生成、课堂小结、课堂反馈三大功能",
      "注册即送 5 枚 T-Coin，充值 T-Coin 可解锁持续使用",
      "本服务为软件工具，AI 生成内容仅供助教参考，最终发布前需人工核对",
    ],
  },
  {
    title: "2. T-Coin 规则",
    items: [
      "课堂小结、课堂反馈每次生成消耗 1 枚 T-Coin（生成失败不扣费）",
      "扣费顺序：先扣赠送 T-Coin → 余额不足再扣充值 T-Coin",
      "注册赠送的 5 枚 T-Coin 用完不再补发，仅充值 T-Coin 可继续使用",
      "T-Coin 不可转让、不可兑现、不可退款",
      "充值 T-Coin 一经使用不再退款（未使用部分除外，详见退款条款）",
    ],
  },
  {
    title: "3. 退款条款",
    items: [
      "未使用的充值 T-Coin 余额可申请退款，需联系客服并提供购买凭证",
      "已使用的 T-Coin 因 AI 服务已消耗，不支持退款",
      "因账号违规被封禁，不支持退款",
      "退款将在 7 个工作日内原路退回",
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
      "如服务终止，将提前 30 天公告，并按比例退还未使用 T-Coin",
      "因不可抗力导致的服务中断，不承担赔偿责任",
    ],
  },
  {
    title: "8. 争议解决",
    items: [
      "本条款适用中华人民共和国法律",
      "如发生争议，应先友好协商；协商不成的，提交开发者所在地有管辖权的法院解决",
      "本文档最后更新于 2026-06-20",
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
          <h1 className="text-4xl md:text-5xl font-bold text-ink tracking-tight">
            使用前请阅读
          </h1>
          <p className="mt-6 text-lg text-ink-muted leading-relaxed">
            本条款约定你与 Lekao Agent 之间的权利与义务。
            <br />
            注册账号即视为同意本条款全部内容。
          </p>
          <p className="mt-4 text-sm text-ink-subtle">
            最后更新：2026-06-20
          </p>
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