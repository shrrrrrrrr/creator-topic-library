"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ListChecks, Search, Tags } from "lucide-react";
import { EmptyState } from "@/components/app-shell/empty-state";
import { ErrorState } from "@/components/app-shell/error-state";
import { LoadingState } from "@/components/app-shell/loading-state";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import {
  getScoreRecords,
  getTags,
  getTopics,
} from "@/lib/storage/app-storage";
import type { ScoreRecord } from "@/types/scoring";
import type { Tag } from "@/types/tag";
import type { Topic, TopicStatus } from "@/types/topic";

const statusLabels: Record<TopicStatus, string> = {
  draft: "草稿",
  planned: "计划中",
  in_progress: "进行中",
  completed: "已完成",
  reviewed: "已复盘",
};

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

function filterTopics(topics: Topic[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return topics;
  }

  return topics.filter((topic) =>
    `${topic.title} ${topic.description}`.toLowerCase().includes(normalizedKeyword)
  );
}

export function ScoreTopicList() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [scoreRecords, setScoreRecords] = useState<ScoreRecord[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      setTopics(getTopics());
      setTags(getTags());
      setScoreRecords(getScoreRecords());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "评分页面加载失败。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const tagMap = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const filteredTopics = useMemo(() => filterTopics(topics, query), [query, topics]);

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Scoring"
        title="评分"
        description="选择一个选题，进入评分界面并保存评分记录。"
      />

      <form
        className="rounded-lg border border-border bg-card p-4 shadow-sm"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="sr-only" htmlFor="score-topic-search">
          搜索选题
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="score-topic-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题或描述"
            type="search"
            value={query}
          />
        </div>
      </form>

      {isLoading ? <LoadingState /> : null}
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {!isLoading && !errorMessage && filteredTopics.length === 0 ? (
        <EmptyState
          title="没有匹配的选题"
          description="可以调整搜索关键词，或先到选题库新建选题。"
        />
      ) : null}

      {!isLoading && !errorMessage && filteredTopics.length > 0 ? (
        <section className="space-y-3">
          {filteredTopics.map((topic) => {
            const scoreRecord = getTopicScoreRecord(topic, scoreRecords);

            return (
              <Link
                className="block rounded-lg border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                href={`/score/topics/${topic.id}`}
                key={topic.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-3">
                    <div>
                      <h2 className="line-clamp-2 text-base font-semibold">
                        {topic.title}
                      </h2>
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
                      <p className="text-xs text-muted-foreground">当前评分</p>
                      <p className="text-sm font-semibold">
                        {scoreRecord ? scoreRecord.totalScore.toFixed(1) : "未评分"}
                      </p>
                      {scoreRecord ? (
                        <p className="text-xs text-muted-foreground">
                          {topic.status === "completed" || topic.status === "reviewed"
                            ? "已完成"
                            : `${scoreRecord.level} 级`}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-5 text-muted-foreground"
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      ) : null}

      <div className="fixed bottom-24 right-5 z-20 flex flex-col gap-3 sm:right-[calc(50%-22rem)]">
        <Button asChild className="size-16 rounded-full shadow-lg">
          <Link aria-label="评分标准管理" href="/score/templates">
            <span className="flex flex-col items-center gap-1 text-xs">
              <ListChecks aria-hidden="true" className="size-5" />
              评分标准
            </span>
          </Link>
        </Button>
        <Button asChild className="size-16 rounded-full shadow-lg" variant="secondary">
          <Link aria-label="标签管理" href="/score/tags">
            <span className="flex flex-col items-center gap-1 text-xs">
              <Tags aria-hidden="true" className="size-5" />
              标签
            </span>
          </Link>
        </Button>
      </div>
    </main>
  );
}
