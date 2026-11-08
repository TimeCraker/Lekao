/**
 * S03 T-305 · 四工作流统一步骤模型（契约层）
 *
 * 目标语义：每条教学流程都能映射到同一套四步——
 *   import（导入） → fill（校对/填写） → generate（生成） → deliver（交付）
 *
 * 映射以**现有步骤枚举为准**（不改变任何流程的状态机），
 * 供步骤指示器、统一交付面与 E2E 使用同一套语义；
 * 小结/反馈模板是「状态型」流程（idle/生成中/完成），其后随 T-305 迁移时补充映射。
 */

import type { MistakeStep } from "@/lib/mistake/types";
import type { WeekendStep } from "@/lib/mistake/weekend-types-base";

export const WORKFLOW_STEPS = [
  "import",
  "fill",
  "generate",
  "deliver",
] as const;

export type WorkflowStep = (typeof WORKFLOW_STEPS)[number];

export const WORKFLOW_STEP_LABELS: Record<WorkflowStep, string> = {
  import: "导入",
  fill: "校对",
  generate: "生成",
  deliver: "交付",
};

/** 错题集：upload/selectSheet/confirmCover=导入，fillSlots=校对，export=交付 */
export function mistakeStepToWorkflow(step: MistakeStep): WorkflowStep {
  switch (step) {
    case "upload":
    case "selectSheet":
    case "confirmCover":
      return "import";
    case "fillSlots":
      return "fill";
    case "export":
      return "deliver";
  }
}

/** 周末反馈表：upload=导入，editDate/editStudents/aiFeedback=校对/生成，export=交付 */
export function weekendStepToWorkflow(step: WeekendStep): WorkflowStep {
  switch (step) {
    case "upload":
      return "import";
    case "editDate":
    case "editStudents":
      return "fill";
    case "aiFeedback":
      return "generate";
    case "export":
      return "deliver";
  }
}

/** 小结/反馈（班级级生成）：上传图片=导入，其余在输出页完成（生成/交付一体） */
export function summaryPhaseToWorkflow(
  phase: "input" | "generating" | "output",
): WorkflowStep {
  switch (phase) {
    case "input":
      return "import";
    case "generating":
      return "generate";
    case "output":
      return "deliver";
  }
}
