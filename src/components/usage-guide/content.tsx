/**
 * 3 模块使用说明内容数据
 * 内容按"步骤"切分，每步一个核心动作 + 一个 tip
 * tip 用浅蓝条呈现（不要超过 1 行）
 */

import {
  ExcelIcon,
  GridIcon,
  EditIcon,
  ListIcon,
  UsersIcon,
  WordIcon,
  FilterIcon,
  ImageIcon,
  SparkleIcon,
  CopyIcon,
  CoinIcon,
  CheckIcon,
  DownloadIcon,
  LightbulbIcon,
  UploadIcon,
} from "@/components/icons";
import type { UsageSection } from "./modal";

/* ============================================
 * 1. 错题集生成 · 6 步
 * ============================================ */
export const MISTAKE_GUIDE: {
  title: string;
  subtitle: string;
  sections: UsageSection[];
} = {
  title: "错题集生成 · 使用说明",
  subtitle: "上传 Excel 错题表 → AI 自动整理 → 一键导出 Word 文档",
  sections: [
    {
      title: "操作流程（5 步）",
      steps: [
        {
          icon: ExcelIcon,
          title: "上传 Excel 错题表",
          desc: "拖拽或点击选择 .xlsx / .xls 文件。表头需包含「姓名」「堂测错题」「作业错题」等列名（模糊匹配即可）。",
          tip: "没有现成表？点下方「下载 Excel 录入模板」直接套用。",
        },
        {
          icon: GridIcon,
          title: "选择学科 Sheet",
          desc: "一个 Excel 可含多个 Sheet（语数外物化），点击选择本次要生成的学科。",
        },
        {
          icon: EditIcon,
          title: "确认 Word 封面信息",
          desc: "AI 预提取「学科」「班级」，可下拉选其他选项或手动改。封面会出现在每份 Word 第一页。",
        },
        {
          icon: ListIcon,
          title: "填题号（图片 / 文字 / 全对）",
          desc: "全班共有的错题号自动去重。每个槽位 3 种填法：点击上传 / Ctrl+V 粘贴 / 直接拖拽图片 / 纯文字 / 标「全对」跳过。",
          tip: "截图后直接 Ctrl+V 粘贴到任意题号槽位，无需保存图片。",
        },
        {
          icon: UsersIcon,
          title: "选择学生",
          desc: "默认全选全班。点「全不选」逐个勾，或用「全选 / 全不选」批量切换。「✓」标记 = 该生全对无错题。",
        },
        {
          icon: WordIcon,
          title: "导出 Word 文档",
          desc: "Chrome / Edge 可授权本地文件夹（累积模式自动合并历史 section）；Safari / Firefox 走 ZIP 下载。每份 Word 含封面 + 学生名 + 题号 + 图片/文字。",
          tip: "授权文件夹后每次导出自动追加，不会覆盖上次。",
        },
      ],
      footer: {
        tone: "warn",
        text: "注意：当前导出格式固定为 docx（.docx 扩展名，Word 2007+ 可打开）。如需 .doc 旧格式，请用 Word 另存为。",
      },
    },
    {
      title: "费用 · 完全免费",
      steps: [
        {
          icon: CoinIcon,
          title: "本模块不消耗 T-Coin",
          desc: "错题集生成是离线操作（不上传图片给视觉模型），所有解析/导出都在本地完成。注册即可用，无次数限制。",
        },
      ],
    },
  ],
};

/* ============================================
 * 2. 课堂小结 · 4 步
 * ============================================ */
export const SUMMARY_GUIDE: {
  title: string;
  subtitle: string;
  sections: UsageSection[];
} = {
  title: "课堂小结 · 使用说明",
  subtitle: "上传讲义图片 → AI 自动识别 + 撰写 → 流式输出 → 一键复制",
  sections: [
    {
      title: "操作流程（4 步）",
      steps: [
        {
          icon: ImageIcon,
          title: "上传讲义 / 板书图片",
          desc: "拖拽或点击选择 PNG / JPG / JPEG / WebP。最多 10 张，自动压缩到 1.5MB / 张。",
          tip: "支持拍照的板书、PDF 截图、PPT 截图、白板拍照。",
        },
        {
          icon: SparkleIcon,
          title: "点击「一键生成」",
          desc: "AI 分两步：①视觉模型自动识别学科、章节、知识点；②按模板生成 10 条教学建议 + 一段课堂小结。流式输出，边生成边显示。",
          tip: "一般 20-40 秒完成，取决于图片清晰度和网络。",
        },
        {
          icon: CheckIcon,
          title: "核对 AI 识别结果",
          desc: "生成完成后顶部会显示「视觉识别结果」卡片（学科 / 章节 / 知识点）。如有偏差手动调整后重新生成。",
        },
        {
          icon: CopyIcon,
          title: "复制并发送",
          desc: "结果分两段：10 条建议（贴 Excel 用）+ 课堂小结（贴群用）。点右侧按钮一键复制整段，可直接粘到 Excel / 微信群。",
          tip: "建议先核对学科/章节再粘贴，避免后期返工。",
        },
      ],
      footer: {
        tone: "info",
        text: "每次生成扣 1 T-Coin。新注册赠送 5 枚，足够 5 次完整生成。",
      },
    },
    {
      title: "扣费顺序",
      steps: [
        {
          icon: CoinIcon,
          title: "先赠币 → 再充值",
          desc: "注册赠送 5 枚 T-Coin 优先消耗；用完后消耗充值 T-Coin（在「个人中心」查看余额）。",
          tip: "充值通道 Phase 2 上线，敬请期待。",
        },
      ],
    },
  ],
};

/* ============================================
 * 3. 作业/堂测反馈 · 4 步
 * ============================================ */
export const FEEDBACK_GUIDE: {
  title: string;
  subtitle: string;
  sections: UsageSection[];
} = {
  title: "作业/堂测反馈 · 使用说明",
  subtitle: "上传讲义图片 → AI 按作业/堂测批改风格 → 流式输出 → 一键复制",
  sections: [
    {
      title: "操作流程（4 步）",
      steps: [
        {
          icon: ImageIcon,
          title: "上传堂测试卷 / 学生答案图",
          desc: "拖拽或点击选择 PNG / JPG / JPEG / WebP。最多 10 张，自动压缩到 1.5MB / 张。",
          tip: "学生答题模糊也能识别，AI 会标「待确认」。",
        },
        {
          icon: SparkleIcon,
          title: "点击「一键生成」",
          desc: "AI 分两步：①视觉识别题目和答案；②按堂测批改风格生成具体可执行的反馈。流式输出。",
          tip: "20-40 秒完成。可中途「清空」重新开始。",
        },
        {
          icon: CheckIcon,
          title: "核对视觉识别",
          desc: "顶部「视觉识别结果」显示学科、章节、知识点。识别错误可手动调整，避免后续内容跑偏。",
        },
        {
          icon: CopyIcon,
          title: "复制并发送",
          desc: "结果分两段：20 条具体反馈（贴 Excel 用）+ 作业/堂测总体反馈（贴群用）。点击按钮一键复制。",
          tip: "反馈内容比课堂小结更具体，针对每道错题给出建议。",
        },
      ],
      footer: {
        tone: "info",
        text: "每次生成扣 1 T-Coin。注册赠送 5 枚。",
      },
    },
    {
      title: "与「课堂小结」的区别",
      steps: [
        {
          icon: FilterIcon,
          title: "课堂小结 = 备课视角",
          desc: "聚焦「这堂课讲了什么 + 改进建议」，更适合内部存档。",
        },
        {
          icon: CheckIcon,
          title: "作业/堂测反馈 = 批改视角",
          desc: "聚焦「学生哪里错了 + 怎么改」，更适合发给家长或学生。",
        },
      ],
    },
  ],
};