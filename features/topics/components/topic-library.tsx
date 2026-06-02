"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Clock3,
  FolderOpen,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { EmptyState } from "@/components/app-shell/empty-state";
import { ErrorState } from "@/components/app-shell/error-state";
import { LoadingState } from "@/components/app-shell/loading-state";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { useDataSyncVersion } from "@/features/sync/data-sync-provider";
import {
  getScoreRecords,
  getSearchHistory,
  getTags,
  getTopics,
  saveSearchHistory,
} from "@/lib/data/repository";
import { cn } from "@/lib/utils";
import type { SearchHistory } from "@/types/search";
import type { ScoreLevel, ScoreRecord } from "@/types/scoring";
import type { Tag } from "@/types/tag";
import type { Topic, TopicStatus } from "@/types/topic";

type TopicGroupId = ScoreLevel | "completed";

type TopicWithScore = {
  topic: Topic;
  scoreRecord?: ScoreRecord;
  groupId: TopicGroupId;
};

const topicGroups: Array<{
  id: TopicGroupId;
  title: string;
  hint: string;
  colorClassName: string;
  badgeClassName: string;
}> = [
  {
    id: "S",
    title: "S 级",
    hint: "优先推进",
    colorClassName: "border-emerald-500/30 bg-emerald-50 text-emerald-900",
    badgeClassName: "bg-emerald-600 text-white",
  },
  {
    id: "A",
    title: "A 级",
    hint: "值得排期",
    colorClassName: "border-sky-500/30 bg-sky-50 text-sky-950",
    badgeClassName: "bg-sky-600 text-white",
  },
  {
    id: "B",
    title: "B 级",
    hint: "继续观察",
    colorClassName: "border-amber-500/30 bg-amber-50 text-amber-950",
    badgeClassName: "bg-amber-500 text-white",
  },
  {
    id: "C",
    title: "C 级",
    hint: "需要补强",
    colorClassName: "border-orange-500/30 bg-orange-50 text-orange-950",
    badgeClassName: "bg-orange-600 text-white",
  },
  {
    id: "D",
    title: "D 级",
    hint: "暂缓处理",
    colorClassName: "border-stone-400/40 bg-stone-100 text-stone-900",
    badgeClassName: "bg-stone-700 text-white",
  },
  {
    id: "completed",
    title: "已完成",
    hint: "不再按分评级",
    colorClassName: "border-teal-600/30 bg-teal-50 text-teal-950",
    badgeClassName: "bg-teal-700 text-white",
  },
];

const statusLabels: Record<TopicStatus, string> = {
  draft: "草稿",
  planned: "计划中",
  in_progress: "进行中",
  completed: "已完成",
  reviewed: "已复盘",
};

function isCompletedTopic(topic: Topic) {
  return topic.status === "completed" || topic.status === "reviewed";
}

function getScoreLevel(scoreRecord?: ScoreRecord): ScoreLevel {
  if (scoreRecord?.level) {
    return scoreRecord.level;
  }

  return "D";
}

function getGroupForTopic(topic: Topic, scoreRecord?: ScoreRecord): TopicGroupId {
  if (isCompletedTopic(topic)) {
    return "completed";
  }

  return getScoreLevel(scoreRecord);
}

function getTopicScoreRecord(topic: Topic, scoreRecords: ScoreRecord[]) {
  if (topic.latestScoreRecordId) {
    const latestRecord = scoreRecords.find(
      (record) => record.id === topic.latestScoreRecordId
    );

    if (latestRecord) {
      return latestRecord;
    }
  }

  return scoreRecords
    .filter((record) => record.topicId === topic.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

function filterTopics(topics: TopicWithScore[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return topics;
  }

  return topics.filter(({ topic }) => {
    const searchableText = `${topic.title} ${topic.description}`.toLowerCase();

    return searchableText.includes(normalizedKeyword);
  });
}

export function TopicLibrary() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [scoreRecords, setScoreRecords] = useState<ScoreRecord[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [query, setQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<TopicGroupId>("S");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const syncVersion = useDataSyncVersion();

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [nextTopics, nextTags, nextScoreRecords, nextSearchHistory] =
          await Promise.all([
            getTopics(),
            getTags(),
            getScoreRecords(),
            getSearchHistory("topics"),
          ]);

        if (!isMounted) {
          return;
        }

        setTopics(nextTopics);
        setTags(nextTags);
        setScoreRecords(nextScoreRecords);
        setSearchHistory(nextSearchHistory);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "选题库加载失败。"
          );
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

  const topicsWithScore = useMemo<TopicWithScore[]>(
    () =>
      topics.map((topic) => {
        const scoreRecord = getTopicScoreRecord(topic, scoreRecords);

        return {
          topic,
          scoreRecord,
          groupId: getGroupForTopic(topic, scoreRecord),
        };
      }),
    [scoreRecords, topics]
  );

  const filteredTopics = useMemo(
    () => filterTopics(topicsWithScore, query),
    [query, topicsWithScore]
  );

  const selectedGroup = topicGroups.find((group) => group.id === selectedGroupId);
  const selectedTopics = filteredTopics.filter(
    (item) => item.groupId === selectedGroupId
  );

  const tagMap = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);

  async function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSearchHistory(await saveSearchHistory("topics", query));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "搜索记录保存失败。"
      );
    }
  }

  function applyHistoryKeyword(keyword: string) {
    setQuery(keyword);
  }

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Topic Library"
        title="选题库"
        description="按评分等级整理选题，快速搜索标题和描述。"
      />

      <div className="flex justify-end">
        <Button asChild>
          <Link href="/topics/new">
            <Plus aria-hidden="true" className="size-4" />
            新建选题
          </Link>
        </Button>
      </div>

      <form
        className="rounded-lg border border-border bg-card p-4 shadow-sm"
        onSubmit={handleSearchSubmit}
      >
        <label className="sr-only" htmlFor="topic-search">
          搜索选题
        </label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="topic-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题或描述"
              type="search"
              value={query}
            />
          </div>
          <Button type="submit">搜索</Button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Clock3 aria-hidden="true" className="size-4" />
            最近搜索
          </div>
          {searchHistory.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {searchHistory.slice(0, 6).map((item) => (
                <button
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground transition hover:border-primary hover:text-primary"
                  key={item.id}
                  onClick={() => applyHistoryKeyword(item.keyword)}
                  type="button"
                >
                  {item.keyword}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">暂无搜索记录</p>
          )}
        </div>
      </form>

      {isLoading ? <LoadingState /> : null}
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {!isLoading && !errorMessage && topics.length === 0 ? (
        <EmptyState
          title="暂无选题"
          description="本地还没有选题数据，后续可以从新建选题流程开始添加。"
        />
      ) : null}

      {!isLoading && !errorMessage && topics.length > 0 ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            {topicGroups.map((group) => {
              const count = filteredTopics.filter(
                (item) => item.groupId === group.id
              ).length;
              const isSelected = selectedGroupId === group.id;

              return (
                <button
                  className={cn(
                    "rounded-lg border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    group.colorClassName,
                    isSelected && "ring-2 ring-primary/30"
                  )}
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FolderOpen aria-hidden="true" className="size-5" />
                        <h2 className="text-base font-semibold">{group.title}</h2>
                      </div>
                      <p className="text-xs opacity-80">{group.hint}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex min-w-9 justify-center rounded-md px-2 py-1 text-xs font-semibold",
                        group.badgeClassName
                      )}
                    >
                      {count}
                    </span>
                  </div>
                </button>
              );
            })}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedGroup?.title ?? "选题列表"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {query.trim()
                    ? `当前搜索命中 ${selectedTopics.length} 个选题`
                    : `当前分组有 ${selectedTopics.length} 个选题`}
                </p>
              </div>
              <Sparkles aria-hidden="true" className="size-5 text-primary" />
            </div>

            {selectedTopics.length > 0 ? (
              <div className="space-y-3">
                {selectedTopics.map(({ topic, scoreRecord, groupId }) => (
                  <Link
                    className="block rounded-lg border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                    href={`/topics/${topic.id}`}
                    key={topic.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-3">
                        <div>
                          <h3 className="line-clamp-2 text-base font-semibold text-card-foreground">
                            {topic.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {topic.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {topic.tagIds.map((tagId) => {
                            const tag = tagMap.get(tagId);

                            if (!tag) {
                              return null;
                            }

                            return (
                              <span
                                className="rounded-md border px-2 py-1 text-xs font-medium"
                                key={tag.id}
                                style={{
                                  borderColor: tag.color,
                                  color: tag.color,
                                }}
                              >
                                {tag.name}
                              </span>
                            );
                          })}
                          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {statusLabels[topic.status]}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">评分</p>
                          <p className="text-sm font-semibold text-foreground">
                            {isCompletedTopic(topic)
                              ? "已完成"
                              : scoreRecord
                                ? scoreRecord.totalScore.toFixed(1)
                                : "未评分"}
                          </p>
                          {!isCompletedTopic(topic) ? (
                            <p className="text-xs text-muted-foreground">{groupId} 级</p>
                          ) : null}
                        </div>
                        <ChevronRight
                          aria-hidden="true"
                          className="size-5 text-muted-foreground"
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="这个分组暂无选题"
                description="可以切换其他评分等级，或调整搜索关键词后再查看。"
              />
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}


