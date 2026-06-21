/**
 * Lekao 邮件 HTML 模板
 *
 * ⭐ 邮件客户端兼容性要求:
 * - Table-based layout (不用 flex / grid)
 * - 全部 inline CSS (不用 <style> in head)
 * - 字体 web-safe (Arial / Helvetica / sans-serif)
 * - 不用 SVG / JavaScript
 * - 宽度 600px (行业标准, 移动端友好)
 * - 不用 background-image (Outlook 不支持)
 *
 * 设计语言: PRD §2.2 浅蓝白主题
 * - 主色 #3b82f6 (blue-500)
 * - 文字 #0a0f1a (深蓝黑)
 * - 背景 #fafbfc (浅蓝白)
 */

import type { EmailPurpose } from "./email";

const PURPOSE_TEXT: Record<EmailPurpose, string> = {
  register: "注册",
  login: "登录",
  reset: "重置密码",
};

export function renderVerificationCodeEmail(opts: {
  code: string;
  purpose: EmailPurpose;
  expiresInMinutes: number;
}): string {
  const { code, purpose, expiresInMinutes } = opts;
  const purposeText = PURPOSE_TEXT[purpose];

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>您的 Lekao 验证码</title>
</head>
<body style="margin:0;padding:0;background-color:#fafbfc;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Helvetica Neue','Microsoft YaHei',Arial,sans-serif;color:#0a0f1a;-webkit-font-smoothing:antialiased;">

<!-- 100% 背景容器 -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafbfc;">
<tr>
<td align="center" style="padding:48px 16px;">

  <!-- 600px 主卡片 -->
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:18px;overflow:hidden;">

    <!-- 顶部 accent 色条 -->
    <tr>
      <td style="height:4px;background-color:#3b82f6;font-size:0;line-height:0;">&nbsp;</td>
    </tr>

    <!-- Header · Logo + Brand -->
    <tr>
      <td align="center" style="padding:40px 40px 28px 40px;">
        <!-- Logo: 48x48 圆角方块 + L 字 -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px auto;">
          <tr>
            <td align="center" valign="middle" width="56" height="56" style="width:56px;height:56px;background-color:#3b82f6;border-radius:14px;color:#ffffff;font-size:28px;font-weight:700;font-family:Arial,sans-serif;line-height:56px;text-align:center;">L</td>
          </tr>
        </table>
        <div style="font-size:22px;font-weight:600;color:#0a0f1a;letter-spacing:-0.02em;line-height:1.2;">Lekao</div>
        <div style="font-size:13px;color:#475569;margin-top:6px;line-height:1.4;">AI 智能助教助手</div>
      </td>
    </tr>

    <!-- 分隔线 -->
    <tr>
      <td style="padding:0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="height:1px;background-color:#e2e8f0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body · 主内容 -->
    <tr>
      <td style="padding:40px 40px 32px 40px;">
        <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:600;color:#0a0f1a;line-height:1.3;letter-spacing:-0.01em;">您的验证码</h1>
        <p style="margin:0 0 28px 0;font-size:15px;color:#475569;line-height:1.7;">
          您好，欢迎使用 Lekao。请使用以下验证码完成${purposeText}操作。该验证码将在 <strong style="color:#0a0f1a;">${expiresInMinutes} 分钟</strong> 内失效。
        </p>

        <!-- 验证码块 -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:14px;">
          <tr>
            <td align="center" style="padding:32px 24px;">
              <div style="font-size:11px;color:#1e40af;font-weight:600;letter-spacing:0.15em;margin-bottom:14px;font-family:Arial,sans-serif;">VERIFICATION CODE</div>
              <div style="font-family:'SF Mono','JetBrains Mono','Menlo','Consolas','Courier New',monospace;font-size:42px;font-weight:700;color:#1e40af;letter-spacing:0.25em;line-height:1;">${code}</div>
              <div style="font-size:12px;color:#64748b;margin-top:14px;line-height:1.4;">6 位字符 · 大小写不敏感</div>
            </td>
          </tr>
        </table>

        <!-- 安全提示 -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;background-color:#fffbeb;border-left:3px solid #f59e0b;border-radius:6px;">
          <tr>
            <td style="padding:14px 18px;">
              <div style="font-size:13px;font-weight:600;color:#92400e;margin-bottom:4px;line-height:1.4;">⚠️ 安全提醒</div>
              <div style="font-size:13px;color:#78350f;line-height:1.6;">请勿将验证码告诉任何人。Lekao 工作人员不会以任何理由向您索要验证码。</div>
            </td>
          </tr>
        </table>

        <p style="margin:28px 0 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
          如果这不是您本人的操作，请忽略此邮件，您的账户安全不会受到影响。
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color:#fafbfc;padding:28px 40px 32px 40px;border-top:1px solid #e2e8f0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <div style="font-size:13px;color:#475569;line-height:1.5;margin-bottom:8px;">Lekao · 让助教省 1-2 小时/课</div>
              <div style="font-size:13px;line-height:1.5;">
                <a href="https://lekao.asterforge.top" style="color:#3b82f6;text-decoration:none;font-weight:500;">lekao.asterforge.top</a>
              </div>
              <div style="font-size:11px;color:#94a3b8;margin-top:14px;line-height:1.5;">© 2026 Lekao · 鄂ICP备 2026015662 号</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>

  <!-- Sub Footer -->
  <div style="max-width:600px;width:100%;text-align:center;margin-top:20px;">
    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.5;">此邮件由系统自动发出，请勿直接回复</p>
  </div>

</td>
</tr>
</table>
</body>
</html>`;
}