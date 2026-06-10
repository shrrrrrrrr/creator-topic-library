"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/app-shell/empty-state";
import { ErrorState } from "@/components/app-shell/error-state";
import { LoadingState } from "@/components/app-shell/loading-state";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDataSyncVersion } from "@/features/sync/data-sync-provider";
import {
  deleteTopic,
  getScoreRecords,
  getTags,
  getTopics,
  updateTopic,
} from "@/lib/data/repository";
import type { MaterialLink } from "@/types/common";
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

const materialTypeLabels: Record<MaterialLink["type"], string> = {
  image: "图片",
  video: "视频",
  audio: "音频",
  document: "文档",
  other: "其他",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

export function TopicDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [scoreRecords, setScoreRecords] = useState<ScoreRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const syncVersion = useDataSyncVersion();

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [nextTopics, nextTags, nextScoreRecords] = await Promise.all([
          getTopics(),
          getTags(),
          getScoreRecords(),
        ]);

        if (!isMounted) {
          return;
        }

        setTopics(nextTopics);
        setTags(nextTags);
        setScoreRecords(nextScoreRecords);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "选题详情加载失败。"
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

  const topic = topics.find((item) => item.id === params.id);
  const tagMap = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const scoreRecord = topic ? getTopicScoreRecord(topic, scoreRecords) : undefined;

  async function refreshTopics() {
    setTopics(await getTopics());
  }

  async function handleCompleteChange(checked: boolean) {
    if (!topic) {
      return;
    }

    try {
      await updateTopic(topic.id, {
        status: checked ? "completed" : "planned",
      });
      await refreshTopics();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "状态更新失败。");
    }
  }

  async function confirmDelete() {
    if (!topic) {
      return;
    }

    try {
      await deleteTopic(topic.id);
      router.push("/");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "选题删除失败。");
    } finally {
      setIsDeleteDialogOpen(false);
    }
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href="/">
            <ArrowLeft aria-hidden="true" className="size-4" />
            返回选题库
          </Link>
        </Button>

        {topic ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href={`/topics/${topic.id}/edit`}>
                <Pencil aria-hidden="true" className="size-4" />
                编辑
              </Link>
            </Button>
              <Button
                className="border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15"
                onClick={() => setIsDeleteDialogOpen(true)}
                type="button"
                variant="ghost"
              >
              <Trash2 aria-hidden="true" className="size-4" />
              删除
            </Button>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
      />

      {isLoading ? <LoadingState /> : null}
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {!isLoading && !errorMessage && !topic ? (
        <EmptyState title="没有找到选题" description="该选题可能已被删除或不存在。" />
      ) : null}

      {!isLoading && !errorMessage && topic ? (
        <>
          <PageHeader
            eyebrow="Topic Detail"
            title={topic.title}
            description={topic.description}
          />

          <label className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm font-medium text-primary">
            <input
              checked={topic.status === "completed" || topic.status === "reviewed"}
              className="size-4 accent-primary"
              onChange={(event) => handleCompleteChange(event.target.checked)}
              type="checkbox"
            />
            <CheckCircle2 aria-hidden="true" className="size-4" />
            手动标记为已完成
          </label>

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">状态</p>
              <p className="mt-2 text-base font-semibold">{statusLabels[topic.status]}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">评分</p>
              <p className="mt-2 text-base font-semibold">
                {scoreRecord ? scoreRecord.totalScore.toFixed(1) : "未评分"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">等级</p>
              <p className="mt-2 text-base font-semibold">
                {topic.status === "completed" || topic.status === "reviewed"
                  ? "已完成"
                  : scoreRecord?.level ?? "D"}
              </p>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">创建时间</p>
              <p className="mt-2 text-sm font-medium">{formatDateTime(topic.createdAt)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">更新时间</p>
              <p className="mt-2 text-sm font-medium">{formatDateTime(topic.updatedAt)}</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">内容标签</h2>
            <div className="flex flex-wrap gap-2">
              {topic.tagIds.length > 0 ? (
                topic.tagIds.map((tagId) => {
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
                })
              ) : (
                <p className="text-sm text-muted-foreground">暂无标签</p>
              )}
            </div>
          </section>

          {topic.headings.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">多级标题</h2>
              <div className="space-y-2">
                {topic.headings.map((heading) => (
                  <div
                    className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
                    key={heading.id}
                  >
                    H{heading.level} · {heading.text}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">参考链接</h2>
              {topic.referenceLinks.length > 0 ? (
                topic.referenceLinks.map((link) => (
                  <a
                    className="block rounded-lg border border-border bg-card p-4 text-sm transition hover:border-primary/40"
                    href={link.url}
                    key={link.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="flex items-center justify-between gap-3 font-medium">
                      {link.label || link.url}
                      <ExternalLink aria-hidden="true" className="size-4" />
                    </span>
                    {link.note ? (
                      <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                        {link.note}
                      </span>
                    ) : null}
                  </a>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">暂无参考链接</p>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">素材链接</h2>
              {topic.materialLinks.length > 0 ? (
                topic.materialLinks.map((link) => (
                  <a
                    className="block rounded-lg border border-border bg-card p-4 text-sm transition hover:border-primary/40"
                    href={link.url}
                    key={link.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="flex items-center justify-between gap-3 font-medium">
                      {link.label || link.url}
                      <ExternalLink aria-hidden="true" className="size-4" />
                    </span>
                    <span className="mt-2 inline-flex rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {materialTypeLabels[link.type]}
                    </span>
                    {link.note ? (
                      <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                        {link.note}
                      </span>
                    ) : null}
                  </a>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">暂无素材链接</p>
              )}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}


