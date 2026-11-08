// 签到状态类型 — 纯类型文件，client/server 共用（不含 prisma import）
export interface CheckinState {
  todayCheckedIn: boolean;
  todayStreakDay: number; // 今日已签的话是第几天
  currentStreakDay: number; // 本周期已签天数（已点亮的格子数）
  nextStreakDay: number; // 下次签到是第几天
  nextAward: number; // 下次签到奖励
}
