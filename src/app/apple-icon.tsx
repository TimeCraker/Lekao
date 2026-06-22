// ============================================
// LeKao · Apple Touch Icon (iOS 主屏图标)
// ============================================
// iOS 自动添加圆角 + 高光阴影，这里用纯色背景确保视觉一致
// 注意：iOS 不接受透明背景，必须实色填充

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          borderRadius: 36,
          fontSize: 120,
          fontWeight: 800,
          color: "#faf8f3",
          position: "relative",
        }}
      >
        <span style={{ position: "relative", display: "flex", alignItems: "flex-end" }}>
          L
          <span
            style={{
              position: "absolute",
              right: -28,
              bottom: 0,
              width: 36,
              height: 36,
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
