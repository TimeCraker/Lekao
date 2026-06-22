// ============================================
// LeKao · OG Image (社交分享卡片)
// ============================================
// 微信/微博/LinkedIn/Slack 等分享链接时的预览卡片
// 1200×630 标准尺寸，左 Logo + 右文字标语

import { ImageResponse } from "next/og";

export const alt = "LeKao · AI 智能助教助手";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 90px",
          background: "linear-gradient(135deg, #faf8f3 0%, #f0ebe0 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* 左：Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 220,
            height: 220,
            borderRadius: 110,
            background: "#1a1a1a",
            fontSize: 150,
            fontWeight: 800,
            color: "#faf8f3",
            position: "relative",
          }}
        >
          <span style={{ display: "flex", alignItems: "flex-end", position: "relative" }}>
            L
            <span
              style={{
                position: "absolute",
                right: -34,
                bottom: 4,
                width: 44,
                height: 44,
                borderRadius: 22,
                background: "#e85a3c",
              }}
            />
          </span>
        </div>

        {/* 右：标语 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 20,
            maxWidth: 720,
          }}
        >
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              color: "#1a1a1a",
              letterSpacing: -2,
              lineHeight: 1.1,
              display: "flex",
            }}
          >
            LeKao · AI 助教
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 500,
              color: "#525252",
              lineHeight: 1.4,
              display: "flex",
            }}
          >
            让助教从抄错题、写小结里解放出来
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 16,
            }}
          >
            {["课堂小结", "作业反馈", "错题集", "三件套"].map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  padding: "10px 22px",
                  borderRadius: 100,
                  background: "rgba(26, 26, 26, 0.08)",
                  color: "#1a1a1a",
                  fontSize: 26,
                  fontWeight: 600,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
