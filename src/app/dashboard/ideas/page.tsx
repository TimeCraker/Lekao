// ============================================
// Lekao · 灵感墙页面 (v2.2.0 #1)
// ============================================
// 客户端组件（统一管理 tab/sort/query 状态 + 拉取数据）
// 顶部：TopBar + [+ 提个建议] 按钮
// 中部：TOP 3 排行榜（从列表取 top 3）
// 底部：搜索 + Tab + 列表 + 空状态

"use client";

import { useEffect, useState } from "react";
import { PressableButton } from "@/components/ui/pressable-button";
import { TopBar } from "@/components/dashboard/sidebar";
import { LightbulbIcon } from "@/components/icons";
import { TopThree, type TopThreeItem } from "@/components/ideas/top-three";
import {
  IdeaSearchBar,
  type IdeaTab,
  type IdeaSort,
} from "@/components/ideas/idea-search-bar";
import { IdeaSubmitDialog } from "@/components/ideas/idea-submit-dialog";
import { IdeasList, type Idea } from "@/components/ideas/ideas-list";
import { IdeaEmptyState } from "@/components/ideas/idea-empty-state";

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState<IdeaTab>("all");
  const [sort, setSort] = useState<IdeaSort>("likes");
  const [query, setQuery] = useState("");

  async function fetchIdeas() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab,
        sort,
        limit: "50",
      });
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/lekao/ideas?${params.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setIdeas(data.ideas);
      setTotal(data.total);
    } catch (e) {
      console.error("[ideas page] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

  // 拉数据
  // fetchIdeas 首行即 setLoading(true)：用 0ms 调度把它移出 effect 同步路径，
  // 避免 effect 内同步 setState 触发级联渲染（react-hooks/set-state-in-effect）
  useEffect(() => {
    const t = setTimeout(fetchIdeas, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sort]);

  // 搜索 debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if (query !== undefined) fetchIdeas();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // TOP 3 = 当前列表中 likeCount 前 3（已按 sort='likes' 排序时直接取前 3）
  // 如果 sort=latest，则按 likeCount 重新排前 3
  const top3: TopThreeItem[] = (() => {
    if (tab !== "all" || query.trim()) return []; // 仅全部 + 无搜索时显示 TOP 3
    const sorted = [...ideas]
      .filter((i) => i.status === "open")
      .sort((a, b) => {
        if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
      .slice(0, 3);
    return sorted.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      userEmail: i.userEmail,
      likeCount: i.likeCount,
      commentCount: i.commentCount,
    }));
  })();

  return (
    <>
      <TopBar
        title="灵感墙"
        description="大家想要啥新功能？来投票 + 提个建议"
        rightExtra={
          <PressableButton
            type="button"
            variant="primary"
            size="md"
            onClick={() => setDialogOpen(true)}
            className="shrink-0"
          >
            <LightbulbIcon className="w-4 h-4" />
            <span className="hidden sm:inline">提个建议</span>
            <span className="sm:hidden">提议</span>
          </PressableButton>
        }
      />

      <div className="px-4 md:px-12 py-4 md:py-8 max-w-5xl">
        {/* TOP 3（仅全部 Tab + 无搜索时显示） */}
        {!loading && top3.length > 0 && <TopThree items={top3} />}

        {/* 搜索 + Tab + 排序 */}
        <IdeaSearchBar
          tab={tab}
          sort={sort}
          query={query}
          total={total}
          onTabChange={setTab}
          onSortChange={setSort}
          onQueryChange={setQuery}
        />

        {/* 列表 / 空状态 */}
        {loading ? (
          <div className="text-sm text-ink-subtle text-center py-12">
            加载中…
          </div>
        ) : ideas.length === 0 ? (
          <IdeaEmptyState
            variant={query.trim() ? "no-search" : "no-ideas"}
            message={query.trim() ? `没找到包含 "${query}" 的灵感` : undefined}
          />
        ) : (
          <IdeasList
            ideas={ideas}
            onUpdate={setIdeas}
            onTotalChange={setTotal}
          />
        )}
      </div>

      <IdeaSubmitDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => {
          // 提交成功后切到"我提的"让用户看到
          setTab("mine");
          fetchIdeas();
        }}
      />
    </>
  );
}
