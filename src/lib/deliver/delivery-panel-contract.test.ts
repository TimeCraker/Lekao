import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACTION_LABELS,
  resolveDeliveryActions,
  resolveDeliveryState,
} from "./delivery-contract";

/**
 * S04 T-406 · 统一交付面板的**契约**（状态机 × 动作矩阵）
 *
 * 组件的 JSX 会随 S03 视觉调整，但这份语义契约是冻结的：
 * S03 T-305 挂载时依赖这里锁定的行为，不改语义。
 */
describe("resolveDeliveryState 状态机（五种状态）", () => {
  const base = {
    ready: false,
    failed: false,
    building: false,
    hasEditor: false,
    hasContent: true,
  };

  it("失败优先级最高（即使还在生成）", () => {
    expect(
      resolveDeliveryState({ ...base, failed: true, building: true }),
    ).toBe("failed");
  });

  it("生成中其次", () => {
    expect(resolveDeliveryState({ ...base, building: true })).toBe("loading");
  });

  it("无内容是空态", () => {
    expect(resolveDeliveryState({ ...base, hasContent: false })).toBe("empty");
  });

  it("就绪 + 编辑区 = editing（预览即编辑）", () => {
    expect(
      resolveDeliveryState({ ...base, ready: true, hasEditor: true }),
    ).toBe("editing");
  });

  it("就绪无编辑区 = ready", () => {
    expect(resolveDeliveryState({ ...base, ready: true })).toBe("ready");
  });
});

describe("resolveDeliveryActions 动作矩阵（五个动作）", () => {
  it("ready：下载 + 打印（有字节即可下载）", () => {
    expect(
      resolveDeliveryActions({ state: "ready", canDownload: true }),
    ).toEqual(["download", "print"]);
  });

  it("没有下载途径时只出打印（如周末表：下载由导出栏负责）", () => {
    expect(
      resolveDeliveryActions({ state: "ready", canDownload: false }),
    ).toEqual(["print"]);
  });

  it("挂了回调才出现对应动作（批量/重新编辑/历史）", () => {
    const actions = resolveDeliveryActions({
      state: "editing",
      canDownload: true,
      onBatch: () => undefined,
      onReedit: () => undefined,
      onHistory: () => undefined,
    });
    expect(actions).toEqual([
      "download",
      "print",
      "batch",
      "reedit",
      "history",
    ]);
  });

  it("非就绪态：下载/打印/批量/历史都不给，只有重新编辑可走（回到源模型修数据）", () => {
    for (const state of ["loading", "failed", "empty"] as const) {
      expect(
        resolveDeliveryActions({
          state,
          canDownload: true,
          onBatch: () => undefined,
          onReedit: () => undefined,
          onHistory: () => undefined,
        }),
      ).toEqual(["reedit"]);
    }
  });

  it("五个动作都有中文缺省文案", () => {
    expect(Object.keys(DEFAULT_ACTION_LABELS).sort()).toEqual(
      ["batch", "download", "history", "print", "reedit"].sort(),
    );
    expect(DEFAULT_ACTION_LABELS.print).toContain("PDF");
  });
});
