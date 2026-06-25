// ============================================
// Lekao · 灵感墙 · 搜索 + 排序 + Tab 筛选 (v2.2.0)
// ============================================
// 3 段：Tab (全部/我提的/我赞过的) + 搜索框 + 排序 (热度/最新)

"use client";

import { SearchIcon, FlameIcon, ClockIcon, ChevronDownIcon } from "@/components/icons";

export type IdeaTab = "all" | "mine" | "loved";
export type IdeaSort = "likes" | "latest";

interface SearchBarProps {
  tab: IdeaTab;
  sort: IdeaSort;
  query: string;
  total: number;
  onTabChange: (t: IdeaTab) => void;
  onSortChange: (s: IdeaSort) => void;
  onQueryChange: (q: string) => void;
}

const TABS: { key: IdeaTab; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "mine", label: "我提的" },
  { key: "loved", label: "我赞过的" },
];

export function IdeaSearchBar({
  tab,
  sort,
  query,
  total,
  onTabChange,
  onSortChange,
  onQueryChange,
}: SearchBarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4 sm:mb-5">
      {/* Tab */}
      <div className="flex items-center gap-1 p-1 bg-canvas-alt rounded-lg overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onTabChange(t.key)}
            className={`shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition ${
              tab === t.key
                ? "bg-white text-accent-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 搜索框 */}
      <div className="relative flex-1 md:max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="搜索标题或描述…"
          className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition"
        />
      </div>

      {/* 排序（左侧 SVG 跟随 sort 状态切换） */}
      <div className="relative shrink-0">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-accent-text">
          {sort === "likes" ? (
            <FlameIcon className="w-4 h-4" />
          ) : (
            <ClockIcon className="w-4 h-4" />
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as IdeaSort)}
          className="pl-8 pr-8 py-2 text-sm bg-white border border-hairline rounded-lg focus:outline-none focus:border-accent transition cursor-pointer appearance-none"
        >
          <option value="likes">热度优先</option>
          <option value="latest">最新发布</option>
        </select>
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-subtle">
          <ChevronDownIcon className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* 计数 */}
      <span className="hidden sm:inline text-xs text-ink-subtle whitespace-nowrap">
        共 {total} 条
      </span>
    </div>
  );
}