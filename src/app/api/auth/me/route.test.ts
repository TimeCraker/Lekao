import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";

/**
 * S01 AC-002 · 个人资料保存接口（T-003）
 *
 * 规格 §4 契约：PATCH /api/auth/profile 等价端点
 * - 输入 {name:string}，trim 后 1–40 字符
 * - 400 校验 / 401 未登录 / 500 稳定错误结构，全部带 correlationId 与 recoveryAction
 * - 成功返回 user + correlationId（并保留旧字段 ok/name 以兼容已发布 Android 客户端）
 * - 只允许 UPDATE name 一个字段（共享 users 表红线）
 */
const { getServerSessionMock, updateMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { update: updateMock } } }));

function patchReq(rawBody: string): NextRequest {
  return new NextRequest("http://localhost:3101/api/auth/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
}

async function envelope(res: Response) {
  return (await res.json()) as {
    error: string;
    code: string;
    correlationId: string;
    recoveryAction: { kind: string; label: string };
    billingState: string;
    user?: { id: string; email: string; name: string | null };
    name?: string;
    ok?: boolean;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
  updateMock.mockResolvedValue({
    id: "u1",
    email: "teacher@example.com",
    name: "新名字",
  });
});

describe("PATCH /api/auth/me", () => {
  it("未登录返回 401 且带完整错误契约", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await PATCH(patchReq(JSON.stringify({ name: "x" })));
    expect(res.status).toBe(401);
    const body = await envelope(res);
    expect(body.code).toBe("UNAUTHENTICATED");
    expect(body.correlationId).toMatch(/^lekao-profile-/);
    expect(body.recoveryAction.label.length).toBeGreaterThan(0);
  });

  it("非法 JSON 返回 400", async () => {
    const res = await PATCH(patchReq("not-json"));
    expect(res.status).toBe(400);
    expect((await envelope(res)).code).toBe("INVALID_REQUEST");
  });

  it("name 非字符串 / 空白 / 超长都返回 400（不再用 422）", async () => {
    for (const body of [
      JSON.stringify({}),
      JSON.stringify({ name: 42 }),
      JSON.stringify({ name: "   " }),
      JSON.stringify({ name: "x".repeat(41) }),
    ]) {
      const res = await PATCH(patchReq(body));
      expect(res.status, `body=${body} 应为 400`).toBe(400);
      expect((await envelope(res)).code).toBe("INVALID_REQUEST");
    }
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("trim 后 40 字符是允许的上界", async () => {
    const name = "x".repeat(40);
    const res = await PATCH(patchReq(JSON.stringify({ name: `  ${name}  ` })));
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" }, data: { name } }),
    );
  });

  it("成功时只更新 name 字段并返回 user + correlationId", async () => {
    const res = await PATCH(patchReq(JSON.stringify({ name: " 王老师 " })));
    expect(res.status).toBe(200);
    const body = await envelope(res);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const arg = updateMock.mock.calls[0][0] as {
      where: unknown;
      data: Record<string, unknown>;
    };
    expect(arg.where).toEqual({ id: "u1" });
    // 共享 users 表红线：data 只允许 name
    expect(Object.keys(arg.data)).toEqual(["name"]);
    expect(arg.data.name).toBe("王老师");
    expect(body.user).toEqual({
      id: "u1",
      email: "teacher@example.com",
      name: "新名字",
    });
    expect(body.correlationId).toMatch(/^lekao-profile-/);
    // 兼容旧客户端
    expect(body.ok).toBe(true);
    expect(body.name).toBe("新名字");
  });

  it("数据库失败返回 500 且不出现成功态字段", async () => {
    updateMock.mockRejectedValue(new Error("db down"));
    const res = await PATCH(patchReq(JSON.stringify({ name: "王老师" })));
    expect(res.status).toBe(500);
    const body = await envelope(res);
    expect(body.code).toBe("INTERNAL");
    expect(body.ok).toBeUndefined();
    expect(body.user).toBeUndefined();
  });
});
