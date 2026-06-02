"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpenText, ChevronRight, FileText, Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/app-shell/empty-state";
import { ErrorState } from "@/components/app-shell/error-state";
import { LoadingState } from "@/components/app-shell/loading-state";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { useDataSyncVersion } from "@/features/sync/data-sync-provider";
import { getReviews, getTopics } from "@/lib/data/repository";
import type { Review } from "@/types/review";
import type { Topic } from "@/types/topic";

function isReviewableTopic(topic: Topic) {
  return topic.status === "completed" || topic.status === "reviewed";
}

function filterTopics(topics: Topic[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return topics;
  }

  return topics.filter((topic) =>
    `${topic.title} ${topic.description}`.toLowerCase().includes(normalizedKeyword)
  );
}

export function ReviewHome() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const syncVersion = useDataSyncVersion();

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [nextTopics, nextReviews] = await Promise.all([
          getTopics(),
          getReviews(),
        ]);

        if (!isMounted) {
          return;
        }

        setTopics(nextTopics);
        setReviews(nextReviews);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "复盘加载失败。");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [syncVersion]);

  const reviewableTopics = useMemo(
    () => topics.filter(isReviewableTopic),
    [topics]
  );
  const filteredTopics = useMemo(
    () => filterTopics(reviewableTopics, query),
    [query, reviewableTopics]
  );
  const standaloneReviews = reviews.filter((review) => review.topicId === null);

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Review"
        title="复盘"
        description="搜索已完成选题，记录手动数据、总结和下一次改进。"
      />

      <form
        className="rounded-lg border border-border bg-card p-4 shadow-sm"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="sr-only" htmlFor="review-search">
          搜索已完成或已复盘选题
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="review-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="只搜索已完成或已复盘的选题"
            type="search"
            value={query}
          />
        </div>
      </form>

      <div className="flex justify-end">
        <Button asChild>
          <Link href="/review/new">
            <Plus aria-hidden="true" className="size-4" />
            新建复盘
          </Link>
        </Button>
      </div>

      {isLoading ? <LoadingState /> : null}
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {!isLoading && !errorMessage ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">可复盘选题</h2>
            <p className="text-sm text-muted-foreground">
              当前匹配 {filteredTopics.length} 个已完成或已复盘选题
            </p>
          </div>

          {filteredTopics.length > 0 ? (
            <div className="space-y-3">
              {filteredTopics.map((topic) => {
                const review = reviews.find((item) => item.topicId === topic.id);

                return (
                  <Link
                    className="block rounded-lg border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                    href={review ? `/review/${review.id}` : `/review/topics/${topic.id}`}
                    key={topic.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <BookOpenText
                            aria-hidden="true"
                            className="size-4 text-primary"
                          />
                          <h3 className="line-clamp-2 text-base font-semibold">
                            {topic.title}
                          </h3>
                        </div>
                        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {topic.description || "暂无选题描述"}
                        </p>
                        <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {review ? "已有复盘" : "未复盘"}
                        </span>
                      </div>
                      <ChevronRight
                        aria-hidden="true"
                        className="mt-1 size-5 shrink-0 text-muted-foreground"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="暂无可复盘选题"
              description="只有状态为已完成或已复盘的选题会出现在这里。"
            />
          )}
        </section>
      ) : null}

      {!isLoading && !errorMessage ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">独立复盘文档</h2>
            <p className="text-sm text-muted-foreground">
              用于学习记录、经验总结和不依托具体选题的复盘
            </p>
          </div>

          {standaloneReviews.length > 0 ? (
            <div className="space-y-3">
              {standaloneReviews.map((review) => (
                <Link
                  className="block rounded-lg border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  href={`/review/${review.id}`}
                  key={review.id}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText aria-hidden="true" className="size-4 text-primary" />
                        <h3 className="truncate text-base font-semibold">
                          {review.title}
                        </h3>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {review.summary || review.body || "暂无摘要"}
                      </p>
                    </div>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-5 shrink-0 text-muted-foreground"
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="暂无独立复盘"
              description="点击新建复盘，可以创建不绑定选题的学习文档或经验总结。"
            />
          )}
        </section>
      ) : null}
    </main>
  );
}


