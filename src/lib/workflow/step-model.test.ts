import { describe, expect, it } from "vitest";
import type { MistakeStep } from "@/lib/mistake/types";
import type { WeekendStep } from "@/lib/mistake/weekend-types-base";
import {
  WORKFLOW_STEPS,
  WORKFLOW_STEP_LABELS,
  mistakeStepToWorkflow,
  summaryPhaseToWorkflow,
  weekendStepToWorkflow,
  type WorkflowStep,
} from "./step-model";

/**
 * S03 T-305 · 统一步骤模型契约
 *
 * 每条流程的**每一个**具体步骤都必须能映射到四步语义之一——
 * 新增步骤枚举值而漏改映射时， exhaustiveness 测试会红灯。
 */

describe("WORKFLOW_STEPS 契约", () => {
  it("四步顺序固定：导入 → 校对 → 生成 → 交付", () => {
    expect([...WORKFLOW_STEPS]).toEqual([
      "import",
      "fill",
      "generate",
      "deliver",
    ]);
  });

  it("每一步都有中文标签", () => {
    for (const step of WORKFLOW_STEPS) {
      expect(WORKFLOW_STEP_LABELS[step]).toBeTruthy();
    }
  });
});

describe("错题集步骤映射（穷举）", () => {
  const ALL: MistakeStep[] = [
    "upload",
    "selectSheet",
    "confirmCover",
    "fillSlots",
    "export",
  ];

  it("每个 MistakeStep 都映射到合法四步", () => {
    const mapped = ALL.map(mistakeStepToWorkflow);
    for (const step of mapped) {
      expect(WORKFLOW_STEPS).toContain(step);
    }
  });

  it("映射语义：前置三态=导入、填槽=校对、导出=交付", () => {
    expect(mistakeStepToWorkflow("upload")).toBe("import");
    expect(mistakeStepToWorkflow("selectSheet")).toBe("import");
    expect(mistakeStepToWorkflow("confirmCover")).toBe("import");
    expect(mistakeStepToWorkflow("fillSlots")).toBe("fill");
    expect(mistakeStepToWorkflow("export")).toBe("deliver");
  });
});

describe("周末反馈表步骤映射（穷举）", () => {
  const ALL: WeekendStep[] = [
    "upload",
    "editDate",
    "editStudents",
    "aiFeedback",
    "export",
  ];

  it("每个 WeekendStep 都映射到合法四步", () => {
    for (const step of ALL.map(weekendStepToWorkflow)) {
      expect(WORKFLOW_STEPS).toContain(step);
    }
  });

  it("映射语义：上传=导入、改日期/填学生=校对、AI 反馈=生成、导出=交付", () => {
    expect(weekendStepToWorkflow("upload")).toBe("import");
    expect(weekendStepToWorkflow("editDate")).toBe("fill");
    expect(weekendStepToWorkflow("editStudents")).toBe("fill");
    expect(weekendStepToWorkflow("aiFeedback")).toBe("generate");
    expect(weekendStepToWorkflow("export")).toBe("deliver");
  });
});

describe("小结/反馈相位映射", () => {
  it("输入=导入、生成中=生成、输出=交付", () => {
    expect(summaryPhaseToWorkflow("input")).toBe("import");
    expect(summaryPhaseToWorkflow("generating")).toBe("generate");
    expect(summaryPhaseToWorkflow("output")).toBe("deliver");
  });
});

describe("类型回归", () => {
  it("WorkflowStep 覆盖所有四步（编译期守护）", () => {
    const all: WorkflowStep[] = ["import", "fill", "generate", "deliver"];
    expect(all).toHaveLength(WORKFLOW_STEPS.length);
  });
});
