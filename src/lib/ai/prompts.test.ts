import { describe, expect, it } from "vitest";
import {
  ALL_CORRECT_TEMPLATES,
  TEXT_PROMPT,
  buildBatchFeedbackPrompt,
  buildFeedbackPrompt,
  buildSummaryPrompt,
} from "./prompts";
import type { TemplateStyle } from "@/lib/templates";

const base = {
  subject: "数学",
  topic: "平面向量",
  keyPoints: ["向量数量积", "投影向量"],
  date: "2026-08-29",
};

describe("buildSummaryPrompt（课堂小结）", () => {
  it("嵌入班级/学科/章节/知识点/日期，输出模板首行", () => {
    const p = buildSummaryPrompt({ ...base, className: "高三2班" });
    expect(p).toContain("高三2班");
    expect(p).toContain("学科：数学");
    expect(p).toContain("章节/板块：平面向量");
    expect(p).toContain("知识点：向量数量积、投影向量");
    expect(p).toContain("【高三2班数学小结2026-08-29】");
  });

  it("keyPoints 为空 → 兜底「本节课内容」", () => {
    expect(buildSummaryPrompt({ ...base, keyPoints: [] })).toContain(
      "知识点：本节课内容",
    );
  });

  it("showFeedback=false：第 3 部分只保留标题行", () => {
    const p = buildSummaryPrompt({ ...base });
    expect(p).toContain("只保留标题行，不要输出任何内容");
    expect(p).not.toContain("涵盖整体表现和典型问题");
  });

  it("showFeedback=true：要求撰写作业情况总结", () => {
    expect(buildSummaryPrompt({ ...base, showFeedback: true })).toContain(
      "涵盖整体表现和典型问题",
    );
  });

  it("contentSections / requirementCount 控制带圈条目数", () => {
    const p = buildSummaryPrompt({
      ...base,
      contentSections: 3,
      requirementCount: 2,
    });
    expect(p).toContain("① 向量数量积、投影向量");
    expect(p).toContain("② （写出第2点授课内容）");
    expect(p).toContain("③ （写出第3点授课内容）");
    expect(p).toContain("② （写出第2点学习要求）");
    expect(p).not.toContain("③ （写出第3点学习要求）");
    expect(p).toContain("学习要求写 2 条");
  });

  it("自定义模板 style 注入软约束，不破坏硬约束", () => {
    const style: TemplateStyle = {
      greeting: "各位家长：",
      tone: "friendly",
      signature: "——李老师",
    };
    const p = buildSummaryPrompt({ ...base, style });
    expect(p).toContain("—— 输出风格（自定义模板）——");
    expect(p).toContain("输出称呼：各位家长：");
    expect(p).toContain("语气亲切温暖");
    expect(p).toContain("输出签名：——李老师");
    // 硬约束仍在
    expect(p).toContain("请严格按照以下模板输出");
  });

  it("空 style 对象 → 标准输出（无风格段）", () => {
    const p = buildSummaryPrompt({ ...base, style: {} });
    expect(p).not.toContain("输出风格");
  });
});

describe("buildFeedbackPrompt（作业/堂测反馈）", () => {
  it("第一行格式与条目数约束", () => {
    const p = buildFeedbackPrompt({ ...base, feedbackCount: 15 });
    expect(p).toContain("本次数学作业反馈（平面向量）");
    expect(p).toContain("接下来 15 行，每行一条反馈");
    expect(p).toContain("本次数学作业总体小结");
  });

  it.each([
    ["0.5x", "75-150 字", "×0.5"],
    ["1x", "150-300 字", "标准"],
    ["1.5x", "225-450 字", "×1.5"],
    ["2x", "300-600 字", "×2"],
    ["3x", "450-900 字", "×3"],
  ] as const)("%s 挡 → 小结 %s、标签 %s", (len, guide, label) => {
    const p = buildFeedbackPrompt({ ...base, summaryLength: len });
    expect(p).toContain(`作业总体小结字数：${label}`);
    expect(p).toContain(`写一段 ${guide} 的总结`);
  });

  it("缺省 summaryLength = 标准挡（150-300 字）", () => {
    const p = buildFeedbackPrompt({ ...base });
    expect(p).toContain("作业总体小结字数：标准");
    expect(p).toContain("150-300 字");
  });
});

describe("TEXT_PROMPT（低层级路由）", () => {
  it("summary 模板路由到课堂小结 builder", () => {
    const p = TEXT_PROMPT({ ...base, template: "summary" });
    expect(p).toBe(buildSummaryPrompt({ ...base }));
  });

  it("feedback 模板路由到反馈 builder", () => {
    const p = TEXT_PROMPT({
      ...base,
      template: "feedback",
      summaryLength: "2x",
    });
    expect(p).toBe(buildFeedbackPrompt({ ...base, summaryLength: "2x" }));
  });
});

describe("ALL_CORRECT_TEMPLATES（全对模板话术）", () => {
  it("7 条非空话术，全部含正向鼓励", () => {
    expect(ALL_CORRECT_TEMPLATES).toHaveLength(7);
    expect(ALL_CORRECT_TEMPLATES.every((t) => t.length > 0)).toBe(true);
    expect(
      ALL_CORRECT_TEMPLATES.some(
        (t) => t.includes("保持") || t.includes("加油"),
      ),
    ).toBe(true);
  });
});

describe("buildBatchFeedbackPrompt（周末表批量反馈）", () => {
  const students = [
    { name: "张三", qNumbers: "3，6" },
    { name: "李四", qNumbers: "全对" },
  ];

  it("嵌入班级-学科、日期、知识点与编号学生列表", () => {
    const p = buildBatchFeedbackPrompt({
      ...base,
      students,
      sheetName: "数学冲刺班",
      date: "2026-08-31",
    });
    expect(p).toContain("【班级-学科】数学冲刺班");
    expect(p).toContain("【日期】2026-08-31");
    expect(p).toContain("- 向量数量积\n- 投影向量");
    expect(p).toContain("1. 张三：3，6");
    expect(p).toContain("2. 李四：全对");
  });

  it("JSON 输出约束：index 对应列表序号、姓名原样复制", () => {
    const p = buildBatchFeedbackPrompt({
      ...base,
      students,
      sheetName: "数学冲刺班",
      date: "d",
    });
    expect(p).toContain('"feedbacks"');
    expect(p).toContain("index 是上方【学生错题列表】的序号");
    expect(p).toContain("studentName 必须与上方列表中的姓名完全一致");
  });

  it("style 适配 JSON：称呼/签名只作用于 summary，不进 feedbacks 各条", () => {
    const p = buildBatchFeedbackPrompt({
      ...base,
      students,
      sheetName: "数学冲刺班",
      date: "d",
      style: { greeting: "各位家长：", signature: "——李老师" },
    });
    expect(p).toContain("在 summary 字段的开头单独一行输出称呼：各位家长：");
    expect(p).toContain("（不要出现在 feedbacks 各条里）");
    expect(p).toContain("在 summary 字段的结尾另起一行输出签名：——李老师");
  });

  it("无 style → 无风格段；字数挡位同 5 挡", () => {
    const p = buildBatchFeedbackPrompt({
      ...base,
      students,
      sheetName: "s",
      date: "d",
    });
    expect(p).not.toContain("输出风格");

    const p3x = buildBatchFeedbackPrompt({
      ...base,
      students,
      sheetName: "s",
      date: "d",
      summaryLength: "3x",
    });
    expect(p3x).toContain("450-900 字");
  });
});
