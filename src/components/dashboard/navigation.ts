import type { IconProps } from "@/components/icons";
import {
  AdminIcon,
  ClockIcon,
  DashboardIcon,
  FeedbackIcon,
  LightbulbIcon,
  LogoutIcon,
  MistakeIcon,
  ProfileIcon,
  SummaryIcon,
  WeekendIcon,
} from "@/components/icons";

/**
 * S01 T-005 · 工作台导航单一真值
 *
 * 桌面侧边栏与移动端底部导航读同一份数据，避免两套入口漂移。
 * 分组顺序（2026-08-18 信息架构）：总览 → 生成工具 → 我的记录 → 社区；管理组仅 admin。
 */

export type DashboardNavItem = {
  href: string;
  label: string;
  Icon: (props: IconProps) => React.ReactNode;
};

export type DashboardNavGroup = {
  title: string;
  items: DashboardNavItem[];
};

export const NAV_GROUPS: DashboardNavGroup[] = [
  {
    title: "总览",
    items: [{ href: "/dashboard", label: "控制台主页", Icon: DashboardIcon }],
  },
  {
    title: "生成工具",
    items: [
      { href: "/dashboard/mistake", label: "错题集生成", Icon: MistakeIcon },
      {
        href: "/dashboard/weekend-mistake",
        label: "周末反馈表",
        Icon: WeekendIcon,
      },
      { href: "/dashboard/summary", label: "课堂小结", Icon: SummaryIcon },
      {
        href: "/dashboard/feedback",
        label: "作业/堂测反馈",
        Icon: FeedbackIcon,
      },
    ],
  },
  {
    title: "我的记录",
    items: [
      { href: "/dashboard/history", label: "生成历史", Icon: ClockIcon },
      { href: "/dashboard/history-mgmt", label: "错题集历史", Icon: ClockIcon },
      { href: "/dashboard/profile", label: "个人中心", Icon: ProfileIcon },
    ],
  },
  {
    title: "社区",
    items: [{ href: "/dashboard/ideas", label: "灵感墙", Icon: LightbulbIcon }],
  },
];

/** 平铺全部入口（顺序与分组一致） */
export const NAV_ITEMS: DashboardNavItem[] = NAV_GROUPS.flatMap(
  (group) => group.items,
);

/**
 * 移动端底部导航的 4 个高频入口（S01 Spec §3.4）。
 * 取四条核心生成流程：一次点击直达任一核心能力。
 */
export const MOBILE_PRIMARY_HREFS = [
  "/dashboard/mistake",
  "/dashboard/weekend-mistake",
  "/dashboard/summary",
  "/dashboard/feedback",
] as const;

export const MOBILE_PRIMARY_ITEMS: DashboardNavItem[] =
  MOBILE_PRIMARY_HREFS.map((href) => {
    const item = NAV_ITEMS.find((i) => i.href === href);
    if (!item) throw new Error(`移动端底部导航引用了不存在的入口: ${href}`);
    return item;
  });

/**
 * More sheet 的次级入口：控制台主页 + 全部「我的记录」+ 社区。
 * 退出登录由组件渲染（需要 signOut 行为），不在本数据里。
 */
export const MOBILE_MORE_ITEMS: DashboardNavItem[] = NAV_ITEMS.filter(
  (item) => !MOBILE_PRIMARY_HREFS.includes(item.href as never),
);

/** 管理入口（仅 admin 可见，与桌面侧边栏一致） */
export const ADMIN_NAV_ITEM: DashboardNavItem = {
  href: "/admin",
  label: "管理员后台",
  Icon: AdminIcon,
};

/** More sheet 里的退出登录项（行为由组件绑定） */
export const MOBILE_LOGOUT_ITEM = {
  label: "退出登录",
  Icon: LogoutIcon,
} as const;
