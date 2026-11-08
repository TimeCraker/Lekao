import { describe, expect, it } from "vitest";
import { parseSummaryOutput, stripMarkdown } from "./parser";

describe("parseSummaryOutput · 空输入", () => {
  it("空字符串 → 全空结果", () => {
    expect(parseSummaryOutput("", "feedback")).toEqual({
      feedback: "",
      summary: "",
      feedbackTitle: "",
      summaryTitle: "",
    });
    expect(parseSummaryOutput("   \n  ", "summary")).toEqual({
      feedback: "",
      summary: "",
      feedbackTitle: "",
      summaryTitle: "",
    });
  });
});

describe("parseSummaryOutput · summary 模板", () => {
  it("整段作为 summary 输出", () => {
    const raw =
      "【高一(3)班 · 数学小结】\n今天讲解了函数单调性。\n作业整体完成良好。";
    const r = parseSummaryOutput(raw, "summary");
    expect(r.summary).toBe(raw.trim());
    expect(r.feedback).toBe("");
    expect(r.feedbackTitle).toBe("");
  });

  it("首行【】标题提取为 summaryTitle", () => {
    const raw = "【班级学科小结日期】\n正文内容";
    expect(parseSummaryOutput(raw, "summary").summaryTitle).toBe(
      "班级学科小结日期",
    );
  });

  it("首行无【】标题 → 兜底「生成结果」", () => {
    expect(parseSummaryOutput("普通正文", "summary").summaryTitle).toBe(
      "生成结果",
    );
  });
});

describe("parseSummaryOutput · feedback 模板（带总体小结标记）", () => {
  const raw = [
    "本次作业反馈",
    "1. 张三：正确率高，书写工整",
    "2. 李四：第 3 题普遍出错，需订正",
    "本次数学作业总体小结",
    "全班整体完成质量较好，少数同学需加强计算。",
  ].join("\n");

  it("按「本次…总体小结」标记切分为 feedback + summary", () => {
    const r = parseSummaryOutput(raw, "feedback");
    expect(r.feedbackTitle).toBe("本次作业反馈");
    // feedback 正文 = 第一行标题之后、标记之前的全部内容（含第 1、2 项）
    expect(r.feedback).toBe(
      "1. 张三：正确率高，书写工整\n2. 李四：第 3 题普遍出错，需订正",
    );
    expect(r.summaryTitle).toBe("本次数学作业总体小结");
    expect(r.summary).toBe(
      "本次数学作业总体小结\n全班整体完成质量较好，少数同学需加强计算。",
    );
  });

  it("堂测变体「本次…堂测总体小结」同样切分", () => {
    const raw2 = "标题\n第一项\n本次数学堂测总体小结\n堂测小结正文";
    const r = parseSummaryOutput(raw2, "feedback");
    expect(r.summaryTitle).toBe("本次数学堂测总体小结");
    expect(r.summary).toContain("堂测小结正文");
  });

  it("标记出现在首行内 → feedback 正文为空", () => {
    const r = parseSummaryOutput("本次数学作业总体小结 正文", "feedback");
    expect(r.feedback).toBe("");
    expect(r.summaryTitle).toBe("本次数学作业总体小结");
  });
});

describe("parseSummaryOutput · feedback 模板（无总体小结标记）", () => {
  it("第一行当标题，其余全部当 feedback，summary 为空", () => {
    const raw = "本次作业反馈\n1. 张三：良好\n2. 李四：待改进";
    const r = parseSummaryOutput(raw, "feedback");
    expect(r.feedbackTitle).toBe("本次作业反馈");
    expect(r.feedback).toBe("1. 张三：良好\n2. 李四：待改进");
    expect(r.summary).toBe("");
    expect(r.summaryTitle).toBe("");
  });
});

describe("stripMarkdown（防御性去 Markdown 符号）", () => {
  it("去除行首有序列表 / 无序列表符号", () => {
    expect(stripMarkdown("1. 第一行\n* 第二行\n- 第三行\n+ 第四行")).toBe(
      "第一行\n第二行\n第三行\n第四行",
    );
  });

  it("支持括号编号；顿号编号后须跟空白才去除（正则要求 \\s+）", () => {
    expect(stripMarkdown("1) 甲\n2、 乙")).toBe("甲\n乙");
    expect(stripMarkdown("2、乙")).toBe("2、乙"); // 编号后无空白 → 保留
  });

  it("普通行保持原样，多行编号混合", () => {
    const raw = "标题\n1. 张三：良好\n李四普通行";
    expect(stripMarkdown(raw)).toBe("标题\n张三：良好\n李四普通行");
  });

  it("整体 trim", () => {
    expect(stripMarkdown("  \n1. 内容\n  ")).toBe("内容");
  });
});
