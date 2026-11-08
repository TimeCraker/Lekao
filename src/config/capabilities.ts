/**
 * S01 T-007 · 能力真值 registry（FR-001）
 *
 * 单一真值：产品对外声明的能力、费用、限制与恢复动作都从这里取。
 * 字段固定为 id / label / platforms / status / inputs / outputs / billing / limits / recovery，
 * 与 PRD FR-001 一致；文案侧由 src/config/capability-copy.test.ts 做静态一致性校验。
 *
 * 数据来源（2026-10 于 ae71105 复核的代码事实）：
 * - 错题集：src/lib/mistake/** 全客户端，不调 AI、不扣币
 * - 周末反馈表：/api/lekao/feedback/batch 成功才结算 1 币/Sheet（≤5 图、≤60 学生）
 * - 课堂小结 / 作业反馈：/api/lekao/summarize，SSE 流式，成功才结算 1 币/次（≤5 图）
 * - 每日签到：/api/checkin，Asia/Shanghai 自然日一次，2–8 币七日循环
 */

export type CapabilityPlatform = "web" | "android";
export type CapabilityStatus = "available" | "disabled";

export type CapabilityBilling =
  | { kind: "free"; label: string }
  | { kind: "coin"; amount: number; unit: "次" | "Sheet"; label: string }
  | { kind: "reward"; label: string };

export interface Capability {
  id: string;
  label: string;
  platforms: CapabilityPlatform[];
  status: CapabilityStatus;
  inputs: string[];
  outputs: string[];
  billing: CapabilityBilling;
  limits: string[];
  recovery: string[];
}

export const CAPABILITIES: Record<string, Capability> = {
  mistake: {
    id: "mistake",
    label: "错题集生成",
    platforms: ["web"],
    status: "available",
    inputs: ["Excel 错题登记表（.xlsx）", "题目图片（拍照/截图/粘贴）"],
    outputs: ["Word 错题集（.docx，可批量或累积导出）"],
    billing: { kind: "free", label: "完全免费，不消耗 T-Coin" },
    limits: [
      "纯浏览器端生成，不调用 AI",
      "图片与草稿保存在本机浏览器（IndexedDB / 本地文件夹）",
      "Chrome/Edge 可授权目录累积导出，其它浏览器走 ZIP 下载",
    ],
    recovery: [
      "目录授权失效时重新授权，或改用直接下载",
      "图片丢失时重新上传对应题目的图片",
    ],
  },

  "weekend-mistake": {
    id: "weekend-mistake",
    label: "周末反馈表",
    platforms: ["web"],
    status: "available",
    inputs: [
      "机构反馈表 Excel（保留原模板样式）",
      "讲义图片（≤5 张）",
      "学生错题记录",
    ],
    outputs: ["保留模板样式的反馈表 Excel", "可复制的 AI 反馈文本"],
    billing: {
      kind: "coin",
      amount: 1,
      unit: "Sheet",
      label: "1 T-Coin / Sheet",
    },
    limits: [
      "单次 ≤5 张讲义图片、≤60 名学生",
      "生成成功才结算；失败或空响应自动释放不扣费",
      "AI 反馈需人工校对后再交付家长或教务",
    ],
    recovery: [
      "余额不足时联系管理员补充（当前未开放自助充值）",
      "识别不理想时更换更清晰的讲义图片后重试",
      "表头无法识别时手动指定目标列",
    ],
  },

  summary: {
    id: "summary",
    label: "课堂小结",
    platforms: ["web"],
    status: "available",
    inputs: ["讲义图片（≤5 张）"],
    outputs: ["课堂反馈与课堂总体小结两段文本（可直接贴教务表或班级群）"],
    billing: { kind: "coin", amount: 1, unit: "次", label: "1 T-Coin / 次" },
    limits: [
      "单次 ≤5 张讲义图片",
      "生成成功才结算；失败、超时、空输出与流中断自动释放不扣费",
      "输出为 AI 草稿，需人工校对",
    ],
    recovery: [
      "失败后可原样重试（本次未扣费）",
      "余额不足时联系管理员补充（当前未开放自助充值）",
      "上下文超长时减少图片数量",
    ],
  },

  feedback: {
    id: "feedback",
    label: "作业/堂测反馈",
    platforms: ["web"],
    status: "available",
    inputs: ["讲义或作业图片（≤5 张）"],
    outputs: ["按学生或按班级的反馈文本与总体小结"],
    billing: { kind: "coin", amount: 1, unit: "次", label: "1 T-Coin / 次" },
    limits: [
      "单次 ≤5 张图片",
      "生成成功才结算；失败自动释放不扣费",
      "输出为 AI 草稿，需人工校对",
    ],
    recovery: [
      "失败后可原样重试（本次未扣费）",
      "余额不足时联系管理员补充（当前未开放自助充值）",
    ],
  },

  checkin: {
    id: "checkin",
    label: "每日签到",
    platforms: ["web"],
    status: "available",
    inputs: ["无（登录后在控制台主页签到）"],
    outputs: ["赠送 T-Coin（连续第 1–7 天为 2/3/4/5/6/7/8 枚）"],
    billing: { kind: "reward", label: "免费获得奖励，不消耗 T-Coin" },
    limits: [
      "按 Asia/Shanghai 自然日每天一次",
      "连续签到 7 天后回到第 1 天；中断则重新从第 1 天开始",
    ],
    recovery: ["当天已签到时次日再来", "签到失败稍后重试，不重复发放"],
  },
};

/** 需要消耗 T-Coin 的能力（金额用于文案一致性校验） */
export function coinCapabilities(): Capability[] {
  return Object.values(CAPABILITIES).filter((c) => c.billing.kind === "coin");
}

/** 全部计费金额（去重），文案里出现的收费数字必须落在这个集合里 */
export function coinAmounts(): number[] {
  return Array.from(
    new Set(
      coinCapabilities().map((c) =>
        c.billing.kind === "coin" ? c.billing.amount : 0,
      ),
    ),
  );
}
