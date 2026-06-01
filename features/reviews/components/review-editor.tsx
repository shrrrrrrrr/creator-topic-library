"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/app-shell/empty-state";
import { ErrorState } from "@/components/app-shell/error-state";
import { LoadingState } from "@/components/app-shell/loading-state";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import {
  createReview,
  getReviews,
  getTopics,
  updateReview,
  updateTopic,
} from "@/lib/storage/app-storage";
import type { ReferenceLink } from "@/types/common";
import type { Review } from "@/types/review";
import type { Topic, TopicHeading } from "@/types/topic";

type ReviewEditorMode = "create-standalone" | "topic" | "edit";

type ReviewEditorProps = {
  mode: ReviewEditorMode;
};

type ReviewFormState = {
  title: string;
  body: string;
  headings: TopicHeading[];
  imageLinks: ReferenceLink[];
  normalLinks: ReferenceLink[];
  dataDashboardLinks: ReferenceLink[];
  platform: string;
  publishedAt: string;
  readOrPlayCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  shareCount: number;
  followerGrowth: number;
  conversionResult: string;
  summary: string;
  nextImprovement: string;
};

const emptyFormState: ReviewFormState = {
  title: "",
  body: "",
  headings: [],
  imageLinks: [],
  normalLinks: [],
  dataDashboardLinks: [],
  platform: "",
  publishedAt: "",
  readOrPlayCount: 0,
  likeCount: 0,
  commentCount: 0,
  favoriteCount: 0,
  shareCount: 0,
  followerGrowth: 0,
  conversionResult: "",
  summary: "",
  nextImprovement: "",
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ensureNumber(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function reviewToFormState(review: Review): ReviewFormState {
  return {
    title: review.title,
    body: review.body ?? "",
    headings: review.headings ?? [],
    imageLinks: review.imageLinks ?? [],
    normalLinks: review.normalLinks ?? [],
    dataDashboardLinks: review.dataDashboardLinks ?? [],
    platform: review.platform ?? "",
    publishedAt: review.publishedAt ?? "",
    readOrPlayCount: ensureNumber(review.readOrPlayCount),
    likeCount: ensureNumber(review.likeCount),
    commentCount: ensureNumber(review.commentCount),
    favoriteCount: ensureNumber(review.favoriteCount),
    shareCount: ensureNumber(review.shareCount),
    followerGrowth: ensureNumber(review.followerGrowth),
    conversionResult: review.conversionResult ?? "",
    summary: review.summary ?? "",
    nextImprovement: review.nextImprovement ?? "",
  };
}

function normalizeLinks(links: ReferenceLink[]) {
  return links
    .map((link) => ({
      ...link,
      label: link.label.trim(),
      url: link.url.trim(),
      note: link.note?.trim(),
    }))
    .filter((link) => link.label.length > 0 || link.url.length > 0);
}

function normalizeFormState(state: ReviewFormState): ReviewFormState {
  return {
    ...state,
    title: state.title.trim(),
    body: state.body.trim(),
    headings: state.headings
      .map((heading) => ({
        ...heading,
        text: heading.text.trim(),
      }))
      .filter((heading) => heading.text.length > 0),
    imageLinks: normalizeLinks(state.imageLinks),
    normalLinks: normalizeLinks(state.normalLinks),
    dataDashboardLinks: normalizeLinks(state.dataDashboardLinks),
    platform: state.platform.trim(),
    conversionResult: state.conversionResult.trim(),
    summary: state.summary.trim(),
    nextImprovement: state.nextImprovement.trim(),
  };
}

function createContentBlocks(state: ReviewFormState) {
  return [
    ...(state.body
      ? [
          {
            id: createId("review-block"),
            type: "paragraph" as const,
            text: state.body,
          },
        ]
      : []),
    ...state.headings.map((heading) => ({
      id: heading.id,
      type: "heading" as const,
      level: heading.level,
      text: heading.text,
    })),
    ...state.imageLinks.map((link) => ({
      id: link.id,
      type: "imageLink" as const,
      text: link.label,
      url: link.url,
    })),
    ...state.normalLinks.map((link) => ({
      id: link.id,
      type: "link" as const,
      text: link.label,
      url: link.url,
    })),
  ];
}

function createDefaultTitle(topic: Topic | null) {
  return topic ? `${topic.title}：复盘` : "独立复盘文档";
}

export function ReviewEditor({ mode }: ReviewEditorProps) {
  const params = useParams<{ id?: string; topicId?: string }>();
  const router = useRouter();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [formState, setFormState] = useState<ReviewFormState>(emptyFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const topics = getTopics();
      const reviews = getReviews();

      if (mode === "topic") {
        const currentTopic = topics.find((item) => item.id === params.topicId) ?? null;
        const existingReview =
          reviews.find((item) => item.topicId === params.topicId) ?? null;

        setTopic(currentTopic);
        setReview(existingReview);
        setFormState(
          existingReview
            ? reviewToFormState(existingReview)
            : {
                ...emptyFormState,
                title: createDefaultTitle(currentTopic),
              }
        );
      }

      if (mode === "edit") {
        const existingReview = reviews.find((item) => item.id === params.id) ?? null;
        const currentTopic = existingReview?.topicId
          ? topics.find((item) => item.id === existingReview.topicId) ?? null
          : null;

        setTopic(currentTopic);
        setReview(existingReview);
        setFormState(
          existingReview ? reviewToFormState(existingReview) : emptyFormState
        );
      }

      if (mode === "create-standalone") {
        setTopic(null);
        setReview(null);
        setFormState({
          ...emptyFormState,
          title: createDefaultTitle(null),
        });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "复盘编辑器加载失败。");
    } finally {
      setIsLoading(false);
    }
  }, [mode, params.id, params.topicId]);

  function updateField<K extends keyof ReviewFormState>(
    key: K,
    value: ReviewFormState[K]
  ) {
    setFormState((previousState) => ({
      ...previousState,
      [key]: value,
    }));
  }

  function addHeading() {
    updateField("headings", [
      ...formState.headings,
      {
        id: createId("review-heading"),
        level: 2,
        text: "",
      },
    ]);
  }

  function updateHeading(id: string, patch: Partial<TopicHeading>) {
    updateField(
      "headings",
      formState.headings.map((heading) =>
        heading.id === id ? { ...heading, ...patch } : heading
      )
    );
  }

  function removeHeading(id: string) {
    updateField(
      "headings",
      formState.headings.filter((heading) => heading.id !== id)
    );
  }

  function addLink(field: "imageLinks" | "normalLinks" | "dataDashboardLinks") {
    updateField(field, [
      ...formState[field],
      {
        id: createId(field),
        label: "",
        url: "",
        note: "",
      },
    ]);
  }

  function updateLink(
    field: "imageLinks" | "normalLinks" | "dataDashboardLinks",
    id: string,
    patch: Partial<ReferenceLink>
  ) {
    updateField(
      field,
      formState[field].map((link) => (link.id === id ? { ...link, ...patch } : link))
    );
  }

  function removeLink(
    field: "imageLinks" | "normalLinks" | "dataDashboardLinks",
    id: string
  ) {
    updateField(
      field,
      formState[field].filter((link) => link.id !== id)
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationMessage(null);
    setErrorMessage(null);

    const nextState = normalizeFormState(formState);

    if (!nextState.title) {
      setValidationMessage("复盘标题不能为空。");
      return;
    }

    const topicId = mode === "topic" ? params.topicId ?? null : review?.topicId ?? null;
    const payload = {
      ...nextState,
      topicId,
      contentBlocks: createContentBlocks(nextState),
    };

    try {
      const savedReview = review
        ? updateReview(review.id, payload)
        : createReview(payload);

      if (topicId) {
        updateTopic(topicId, {
          status: "reviewed",
        });
      }

      router.push(`/review/${savedReview.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "复盘保存失败。");
    }
  }

  function renderLinks(
    title: string,
    field: "imageLinks" | "normalLinks" | "dataDashboardLinks",
    placeholder: string
  ) {
    return (
      <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button onClick={() => addLink(field)} size="sm" type="button" variant="secondary">
            <Plus aria-hidden="true" className="size-4" />
            添加
          </Button>
        </div>
        {formState[field].length > 0 ? (
          <div className="space-y-3">
            {formState[field].map((link) => (
              <div className="space-y-2 rounded-lg border border-border p-3" key={link.id}>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    onChange={(event) =>
                      updateLink(field, link.id, { label: event.target.value })
                    }
                    placeholder="名称"
                    value={link.label}
                  />
                  <input
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    onChange={(event) =>
                      updateLink(field, link.id, { url: event.target.value })
                    }
                    placeholder={placeholder}
                    value={link.url}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                    onChange={(event) =>
                      updateLink(field, link.id, { note: event.target.value })
                    }
                    placeholder="备注"
                    value={link.note ?? ""}
                  />
                  <Button
                    onClick={() => removeLink(field, link.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    <span className="sr-only">删除链接</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无{title}</p>
        )}
      </section>
    );
  }

  const pageTitle =
    mode === "create-standalone"
      ? "新建复盘"
      : review
        ? "编辑复盘"
        : "新建选题复盘";
  const pageDescription = topic
    ? `绑定选题：${topic.title}`
    : "独立复盘文档，可用于学习文档或经验总结。";

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href="/review">
            <ArrowLeft aria-hidden="true" className="size-4" />
            返回复盘
          </Link>
        </Button>

        {topic ? (
          <Button asChild variant="secondary">
            <Link href={`/topics/${topic.id}`}>
              <ExternalLink aria-hidden="true" className="size-4" />
              跳转到选题信息
            </Link>
          </Button>
        ) : null}
      </div>

      <PageHeader eyebrow="Review Editor" title={pageTitle} description={pageDescription} />

      {isLoading ? <LoadingState /> : null}
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {!isLoading && mode === "topic" && !topic && !errorMessage ? (
        <EmptyState title="没有找到选题" description="该选题可能已被删除或不存在。" />
      ) : null}

      {!isLoading && mode === "edit" && !review && !errorMessage ? (
        <EmptyState title="没有找到复盘" description="该复盘文档可能已被删除或不存在。" />
      ) : null}

      {!isLoading &&
      !errorMessage &&
      (mode === "create-standalone" || review || topic) ? (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {validationMessage ? <ErrorState message={validationMessage} /> : null}

          <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="review-title">
                标题
              </label>
              <input
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="review-title"
                onChange={(event) => updateField("title", event.target.value)}
                value={formState.title}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="review-body">
                正文
              </label>
              <textarea
                className="min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="review-body"
                onChange={(event) => updateField("body", event.target.value)}
                placeholder="记录过程、观察和关键结论"
                value={formState.body}
              />
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">多级标题</h2>
              <Button onClick={addHeading} size="sm" type="button" variant="secondary">
                <Plus aria-hidden="true" className="size-4" />
                添加
              </Button>
            </div>
            {formState.headings.length > 0 ? (
              <div className="space-y-3">
                {formState.headings.map((heading) => (
                  <div
                    className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[96px_1fr_auto]"
                    key={heading.id}
                  >
                    <select
                      className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                      onChange={(event) =>
                        updateHeading(heading.id, {
                          level: Number(event.target.value) as TopicHeading["level"],
                        })
                      }
                      value={heading.level}
                    >
                      <option value={1}>H1</option>
                      <option value={2}>H2</option>
                      <option value={3}>H3</option>
                    </select>
                    <input
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) =>
                        updateHeading(heading.id, { text: event.target.value })
                      }
                      placeholder="标题内容"
                      value={heading.text}
                    />
                    <Button
                      onClick={() => removeHeading(heading.id)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                      <span className="sr-only">删除标题</span>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无多级标题</p>
            )}
          </section>

          {renderLinks("图片链接", "imageLinks", "图片链接")}
          {renderLinks("普通链接", "normalLinks", "普通链接")}
          {renderLinks("数据后台链接", "dataDashboardLinks", "数据后台链接")}

          <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <h2 className="text-base font-semibold">发布与数据</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>发布平台</span>
                <input
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(event) => updateField("platform", event.target.value)}
                  value={formState.platform}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>发布时间</span>
                <input
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(event) => updateField("publishedAt", event.target.value)}
                  type="datetime-local"
                  value={formState.publishedAt}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["阅读量 / 播放量", "readOrPlayCount"],
                ["点赞数", "likeCount"],
                ["评论数", "commentCount"],
                ["收藏数", "favoriteCount"],
                ["转发数", "shareCount"],
                ["涨粉数", "followerGrowth"],
              ].map(([label, key]) => (
                <label className="space-y-2 text-sm font-medium" key={key}>
                  <span>{label}</span>
                  <input
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    min={0}
                    onChange={(event) =>
                      updateField(key as keyof ReviewFormState, Number(event.target.value))
                    }
                    type="number"
                    value={formState[key as keyof ReviewFormState] as number}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <h2 className="text-base font-semibold">结论</h2>
            <label className="space-y-2 text-sm font-medium">
              <span>转化结果</span>
              <textarea
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6"
                onChange={(event) => updateField("conversionResult", event.target.value)}
                value={formState.conversionResult}
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>复盘总结</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6"
                onChange={(event) => updateField("summary", event.target.value)}
                value={formState.summary}
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>下次改进建议</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6"
                onChange={(event) => updateField("nextImprovement", event.target.value)}
                value={formState.nextImprovement}
              />
            </label>
          </section>

          <div className="sticky bottom-20 z-10 flex justify-end rounded-lg border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
            <Button type="submit">
              <Save aria-hidden="true" className="size-4" />
              保存复盘
            </Button>
          </div>
        </form>
      ) : null}
    </main>
  );
}
