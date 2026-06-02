"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/app-shell/empty-state";
import { ErrorState } from "@/components/app-shell/error-state";
import { LoadingState } from "@/components/app-shell/loading-state";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { createTopic, getTags, getTopics, updateTopic } from "@/lib/data/repository";
import { cn } from "@/lib/utils";
import type { MaterialLink, ReferenceLink } from "@/types/common";
import type { Tag } from "@/types/tag";
import type { Topic, TopicHeading, TopicStatus } from "@/types/topic";

type TopicFormProps = {
  mode: "create" | "edit";
};

type TopicFormState = {
  title: string;
  description: string;
  headings: TopicHeading[];
  tagIds: string[];
  status: TopicStatus;
  referenceLinks: ReferenceLink[];
  materialLinks: MaterialLink[];
};

const statusOptions: Array<{ value: TopicStatus; label: string }> = [
  { value: "draft", label: "草稿" },
  { value: "planned", label: "计划中" },
  { value: "in_progress", label: "进行中" },
  { value: "completed", label: "已完成" },
  { value: "reviewed", label: "已复盘" },
];

const materialTypeOptions: Array<{ value: MaterialLink["type"]; label: string }> = [
  { value: "image", label: "图片" },
  { value: "video", label: "视频" },
  { value: "audio", label: "音频" },
  { value: "document", label: "文档" },
  { value: "other", label: "其他" },
];

const emptyFormState: TopicFormState = {
  title: "",
  description: "",
  headings: [],
  tagIds: [],
  status: "planned",
  referenceLinks: [],
  materialLinks: [],
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function topicToFormState(topic: Topic): TopicFormState {
  return {
    title: topic.title,
    description: topic.description,
    headings: topic.headings,
    tagIds: topic.tagIds,
    status: topic.status,
    referenceLinks: topic.referenceLinks,
    materialLinks: topic.materialLinks,
  };
}

function normalizeFormState(state: TopicFormState): TopicFormState {
  return {
    ...state,
    title: state.title.trim(),
    description: state.description.trim(),
    headings: state.headings
      .map((heading) => ({
        ...heading,
        text: heading.text.trim(),
      }))
      .filter((heading) => heading.text.length > 0),
    referenceLinks: state.referenceLinks
      .map((link) => ({
        ...link,
        label: link.label.trim(),
        url: link.url.trim(),
        note: link.note?.trim(),
      }))
      .filter((link) => link.label.length > 0 || link.url.length > 0),
    materialLinks: state.materialLinks
      .map((link) => ({
        ...link,
        label: link.label.trim(),
        url: link.url.trim(),
        note: link.note?.trim(),
      }))
      .filter((link) => link.label.length > 0 || link.url.length > 0),
  };
}

export function TopicForm({ mode }: TopicFormProps) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const [tags, setTags] = useState<Tag[]>([]);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [formState, setFormState] = useState<TopicFormState>(emptyFormState);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const nextTags = await getTags();

        if (!isMounted) {
          return;
        }

        setTags(nextTags);

        if (mode === "edit") {
          const topic = (await getTopics()).find((item) => item.id === params.id);

          if (!isMounted) {
            return;
          }

          if (!topic) {
            setCurrentTopic(null);
            return;
          }

          setCurrentTopic(topic);
          setFormState(topicToFormState(topic));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "选题表单加载失败。"
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
  }, [mode, params.id]);

  const pageTitle = mode === "create" ? "新建选题" : "编辑选题";
  const returnHref = mode === "edit" && currentTopic ? `/topics/${currentTopic.id}` : "/";

  const selectedTagIds = useMemo(() => new Set(formState.tagIds), [formState.tagIds]);

  function updateField<K extends keyof TopicFormState>(
    key: K,
    value: TopicFormState[K]
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
        id: createId("heading"),
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

  function addReferenceLink() {
    updateField("referenceLinks", [
      ...formState.referenceLinks,
      {
        id: createId("reference"),
        label: "",
        url: "",
        note: "",
      },
    ]);
  }

  function updateReferenceLink(id: string, patch: Partial<ReferenceLink>) {
    updateField(
      "referenceLinks",
      formState.referenceLinks.map((link) =>
        link.id === id ? { ...link, ...patch } : link
      )
    );
  }

  function removeReferenceLink(id: string) {
    updateField(
      "referenceLinks",
      formState.referenceLinks.filter((link) => link.id !== id)
    );
  }

  function addMaterialLink() {
    updateField("materialLinks", [
      ...formState.materialLinks,
      {
        id: createId("material"),
        label: "",
        type: "document",
        url: "",
        note: "",
      },
    ]);
  }

  function updateMaterialLink(id: string, patch: Partial<MaterialLink>) {
    updateField(
      "materialLinks",
      formState.materialLinks.map((link) =>
        link.id === id ? { ...link, ...patch } : link
      )
    );
  }

  function removeMaterialLink(id: string) {
    updateField(
      "materialLinks",
      formState.materialLinks.filter((link) => link.id !== id)
    );
  }

  function toggleTag(tagId: string) {
    const nextTagIds = selectedTagIds.has(tagId)
      ? formState.tagIds.filter((id) => id !== tagId)
      : [...formState.tagIds, tagId];

    updateField("tagIds", nextTagIds);
  }

  function toggleCompleted(checked: boolean) {
    updateField("status", checked ? "completed" : "planned");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationMessage(null);
    setErrorMessage(null);

    const nextState = normalizeFormState(formState);

    if (!nextState.title) {
      setValidationMessage("标题不能为空。");
      return;
    }

    try {
      if (mode === "create") {
        const createdTopic = await createTopic(nextState);
        router.push(`/topics/${createdTopic.id}`);
        return;
      }

      if (!currentTopic) {
        setErrorMessage("没有找到要编辑的选题。");
        return;
      }

      await updateTopic(currentTopic.id, nextState);
      router.push(`/topics/${currentTopic.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "选题保存失败。");
    }
  }

  return (
    <main className="space-y-6">
      <Button asChild variant="ghost">
        <Link href={returnHref}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          返回
        </Link>
      </Button>

      <PageHeader
        eyebrow="Topic Editor"
        title={pageTitle}
        description="维护选题基础信息、标题结构、标签和链接素材。"
      />

      {isLoading ? <LoadingState /> : null}
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {!isLoading && mode === "edit" && !currentTopic && !errorMessage ? (
        <EmptyState title="没有找到选题" description="该选题可能已被删除或不存在。" />
      ) : null}

      {!isLoading && (mode === "create" || currentTopic) ? (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {validationMessage ? <ErrorState message={validationMessage} /> : null}

          <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="topic-title">
                标题
              </label>
              <input
                className={cn(
                  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
                  validationMessage && !formState.title.trim() && "border-destructive"
                )}
                id="topic-title"
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="请输入选题标题"
                value={formState.title}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="topic-description">
                描述
              </label>
              <textarea
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="topic-description"
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="记录选题背景、目标受众或内容方向"
                value={formState.description}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="topic-status">
                  状态
                </label>
                <select
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="topic-status"
                  onChange={(event) =>
                    updateField("status", event.target.value as TopicStatus)
                  }
                  value={formState.status}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm">
                <input
                  checked={formState.status === "completed"}
                  className="size-4 accent-primary"
                  onChange={(event) => toggleCompleted(event.target.checked)}
                  type="checkbox"
                />
                <span>标记为已完成</span>
              </label>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">内容标签</h2>
              <p className="text-xs text-muted-foreground">标签和状态保持分离</p>
            </div>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm transition",
                      selectedTagIds.has(tag.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    )}
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    type="button"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无可选标签</p>
            )}
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
                  <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[96px_1fr_auto]" key={heading.id}>
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

          <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">参考链接</h2>
              <Button
                onClick={addReferenceLink}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Plus aria-hidden="true" className="size-4" />
                添加
              </Button>
            </div>
            {formState.referenceLinks.length > 0 ? (
              <div className="space-y-3">
                {formState.referenceLinks.map((link) => (
                  <div className="space-y-2 rounded-lg border border-border p-3" key={link.id}>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        onChange={(event) =>
                          updateReferenceLink(link.id, { label: event.target.value })
                        }
                        placeholder="名称"
                        value={link.label}
                      />
                      <input
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        onChange={(event) =>
                          updateReferenceLink(link.id, { url: event.target.value })
                        }
                        placeholder="链接"
                        value={link.url}
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                        onChange={(event) =>
                          updateReferenceLink(link.id, { note: event.target.value })
                        }
                        placeholder="备注"
                        value={link.note ?? ""}
                      />
                      <Button
                        onClick={() => removeReferenceLink(link.id)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                        <span className="sr-only">删除参考链接</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无参考链接</p>
            )}
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">素材链接</h2>
              <Button
                onClick={addMaterialLink}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Plus aria-hidden="true" className="size-4" />
                添加
              </Button>
            </div>
            {formState.materialLinks.length > 0 ? (
              <div className="space-y-3">
                {formState.materialLinks.map((link) => (
                  <div className="space-y-2 rounded-lg border border-border p-3" key={link.id}>
                    <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                      <input
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        onChange={(event) =>
                          updateMaterialLink(link.id, { label: event.target.value })
                        }
                        placeholder="名称"
                        value={link.label}
                      />
                      <select
                        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                        onChange={(event) =>
                          updateMaterialLink(link.id, {
                            type: event.target.value as MaterialLink["type"],
                          })
                        }
                        value={link.type}
                      >
                        {materialTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) =>
                        updateMaterialLink(link.id, { url: event.target.value })
                      }
                      placeholder="链接"
                      value={link.url}
                    />
                    <div className="flex gap-2">
                      <input
                        className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                        onChange={(event) =>
                          updateMaterialLink(link.id, { note: event.target.value })
                        }
                        placeholder="备注"
                        value={link.note ?? ""}
                      />
                      <Button
                        onClick={() => removeMaterialLink(link.id)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                        <span className="sr-only">删除素材链接</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无素材链接</p>
            )}
          </section>

          <div className="sticky bottom-20 z-10 flex justify-end rounded-lg border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
            <Button type="submit">
              <Save aria-hidden="true" className="size-4" />
              保存
            </Button>
          </div>
        </form>
      ) : null}
    </main>
  );
}

