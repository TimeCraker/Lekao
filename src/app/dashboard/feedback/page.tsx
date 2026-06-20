import { redirect } from "next/navigation";

// 按用户 2026-06-20 决策：小结和反馈合并成 1 个入口（不同 tab 切换）
export default function FeedbackPage() {
  redirect("/dashboard/summary?type=feedback");
}