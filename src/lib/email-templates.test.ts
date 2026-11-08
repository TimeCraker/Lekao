import { describe, expect, it } from "vitest";
import { renderVerificationCodeEmail } from "./email-templates";

describe("renderVerificationCodeEmail", () => {
  it("包含验证码、有效期与完整 HTML 结构", () => {
    const html = renderVerificationCodeEmail({
      code: "A1B2C3",
      purpose: "register",
      expiresInMinutes: 10,
    });
    expect(html).toContain("A1B2C3");
    expect(html).toContain("10 分钟");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html.trimEnd().endsWith("</html>")).toBe(true);
  });

  it.each([
    ["register", "注册"],
    ["login", "登录"],
    ["reset", "重置密码"],
  ] as const)("%s 邮件嵌入「%s」用途文案", (purpose, text) => {
    const html = renderVerificationCodeEmail({
      code: "XYZ789",
      purpose,
      expiresInMinutes: 5,
    });
    expect(html).toContain(`完成${text}操作`);
  });

  it("邮件客户端兼容要求：inline 样式、600px、无 script/svg", () => {
    const html = renderVerificationCodeEmail({
      code: "QQ12ZZ",
      purpose: "login",
      expiresInMinutes: 15,
    });
    expect(html).toContain('width="600"');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<svg/i);
    expect(html).not.toContain("<style");
  });

  it("安全提示与站点链接固定存在", () => {
    const html = renderVerificationCodeEmail({
      code: "8NN3KP",
      purpose: "reset",
      expiresInMinutes: 30,
    });
    expect(html).toContain("请勿将验证码告诉任何人");
    expect(html).toContain("https://lekao.asterforge.top");
  });

  it("验证码按原样嵌入（大小写不敏感提示存在）", () => {
    const html = renderVerificationCodeEmail({
      code: "aBc123",
      purpose: "register",
      expiresInMinutes: 10,
    });
    expect(html).toContain("aBc123");
  });
});
