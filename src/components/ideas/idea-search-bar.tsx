// ============================================
// Lekao · 灵感墙 · 搜索 + 排序 + Tab 筛选 (v2.2.0)
// ============================================
// 3 段：Tab (全部/我提的/我赞过的) + 搜索框 + 排序 (热度/最新)

"use client";

import { SearchIcon } from "@/components/icons";

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
    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
      {/* Tab */}
      <div className="flex items-center gap-1 p-1 bg-canvas-alt rounded-lg">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onTabChange(t.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
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
      <div className="relative flex-1 max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="搜索标题或描述…"
          className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition"
        />
      </div>

      {/* 排序 */}
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as IdeaSort)}
        className="px-3 py-2 text-sm bg-white border border-hairline rounded-lg focus:outline-none focus:border-accent transition cursor-pointer"
      >
        <option value="likes">🔥 热度优先</option>
        <option value="latest">🕒 最新发布</option>
      </select>

      {/* 计数 */}
      <span className="text-xs text-ink-subtle whitespace-nowrap">
        共 {total} 条
      </span>
    </div>
  );
}