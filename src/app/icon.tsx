// ============================================
// LeKao · 动态 Favicon (Next.js 16 ImageResponse)
// ============================================
// 几何 mark：圆形 + L 字符 + signal coral 强调点
// 输出多尺寸 PNG：32×32 / 192×192 / 512×512
// 浏览器会自动选择合适尺寸的 /icon

import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1a1a",
          borderRadius: "50%",
          fontSize: 44,
          fontWeight: 800,
          color: "#faf8f3",
          position: "relative",
        }}
      >
        <span style={{ position: "relative", display: "flex", alignItems: "flex-end" }}>
          L
          {/* signal coral 强调点 */}
          <span
            style={{
              position: "absolute",
              right: -10,
              bottom: 0,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#e85a3c",
            }}
          />
        </span>
      </div>
    ),
    { ...size },
  );
}
