// Lekao 主站 6 张配图清单
// 风格：现代扁平插画 + 浅蓝白品牌色（accent #3b82f6 / canvas #fafbfc / success green #047857）
// 复用 smart-product-publisher 的 MiniMax image-01 真实链路

export const OUTPUT_DIR = new URL("../../public/images/", import.meta.url);

export const IMAGES = [
  {
    file: "hero-illustration.png",
    aspect_ratio: "16:9",
    prompt: `An ultra-minimalist abstract SaaS-style hero illustration, Linear/Vercel/Notion aesthetic. Composition: 3-4 floating translucent geometric cards arranged with slight overlap and gentle tilt angles, anchored in the right-center of the frame. Each card contains only abstract UI placeholders — one has a thin horizontal divider line and a soft blue progress bar, one shows a tiny abstract bar chart outline, one shows a circle with a subtle inner glow representing a checklist. Behind the cards, a large soft gradient orb in pale blue (#3b82f6) fading to transparent, with a faint secondary orb in mint green as accent. Generous whitespace (60%+ empty), single soft drop shadow under each card. Palette is strictly limited: cream-white background, primary blue (#3b82f6), secondary mint (#10b981) accent, neutral grays. No people, no characters, no faces, no coffee cups, no laptops, no books, no notebooks, no actual readable text, no logos, no watermarks. 4K quality, crisp vector-like flat design with depth only via shadows and transparency.`,
  },
  {
    file: "feature-mistake.png",
    aspect_ratio: "3:2",
    prompt: `A flat illustration of an AI-generated mistake collection document cover. The document card has a blue gradient header with a sparkle AI icon. Main body shows a 3x2 grid of mini worksheet thumbnails, each with a small red correction mark on top-right corner. Bottom shows a green "Export Word" button and a progress indicator. Soft cream background with subtle drop shadow. Soft pastel colors with primary blue (#3b82f6) and green (#10b981) accents. Minimalist style, no actual readable text content, no watermark. 4K quality.`,
  },
  {
    file: "feature-summary.png",
    aspect_ratio: "3:2",
    prompt: `A flat illustration of a structured teaching summary document card. Top has a blue header bar with a soft glow effect. Middle section contains 10 numbered list items with checkmark icons in a clean two-column layout. Bottom has a highlighted summary paragraph box in soft mint green. The document card sits on a soft cream background with subtle drop shadow. Soft pastel colors with primary blue (#3b82f6) header and mint green accents. Minimalist style, no actual readable text, no watermark. 4K quality.`,
  },
  {
    file: "feature-feedback.png",
    aspect_ratio: "3:2",
    prompt: `A flat illustration showing an AI grading workflow side by side. Left side shows a printed worksheet image with math problems, some answers circled in red. Right side shows a feedback panel with a teacher avatar icon, a star rating, and three speech bubbles containing correction suggestions. Connected by a curved dotted arrow showing AI processing flow. Soft pastel colors with red and blue accents on cream paper background. Minimalist style, no actual readable text, no watermark. 4K quality.`,
  },
  {
    file: "value-time-comparison.png",
    aspect_ratio: "4:3",
    prompt: `A split-screen flat illustration comparing traditional vs AI workflow for teachers. Left half (warm beige background) shows a tired teacher silhouette with an hourglass showing 1 hour and a stack of papers, with a subtle red color tint indicating stress. Right half (soft mint green background) shows a happy relaxed teacher silhouette with a lightning bolt icon and 5 minutes indicator, papers organized neatly. Center divider shows a clear contrast. Soft pastel color palette, minimalist style, no actual readable text, no watermark. 4K quality.`,
  },
  {
    file: "workflow-pipeline.png",
    aspect_ratio: "21:9",
    prompt: `A horizontal 4-step process flow illustration for an AI teaching tool, ultra-wide cinematic banner format. Four large circles connected by smooth curved arrows in a row across the image. Step 1: cloud upload icon with document symbol. Step 2: AI brain icon with circuit pattern. Step 3: checkmark icon with magnifying glass. Step 4: export document icon with arrow. Each circle in soft blue gradient with subtle glow. Numbers 1-4 in a corner of each circle. Background is soft cream with subtle gradient. Minimalist flat design, no actual readable text, no watermark. 4K quality.`,
  },
];
