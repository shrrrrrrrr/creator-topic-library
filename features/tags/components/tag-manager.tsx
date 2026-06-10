"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/app-shell/empty-state";
import { ErrorState } from "@/components/app-shell/error-state";
import { LoadingState } from "@/components/app-shell/loading-state";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDataSyncVersion } from "@/features/sync/data-sync-provider";
import {
  createTag,
  deleteTag,
  getTags,
  getTopics,
  updateTag,
  updateTopic,
} from "@/lib/data/repository";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types/tag";
import type { Topic } from "@/types/topic";

type TagFormState = {
  name: string;
  color: string;
  description: string;
};

const emptyTagForm: TagFormState = {
  name: "",
  color: "#0f766e",
  description: "",
};

const reservedStatusNames = new Set(["已完成", "草稿", "计划中", "进行中", "已复盘"]);

function tagToFormState(tag: Tag): TagFormState {
  return {
    name: tag.name,
    color: tag.color,
    description: tag.description ?? "",
  };
}

function getTagUsageCount(tagId: string, topics: Topic[]) {
  return topics.filter((topic) => topic.tagIds.includes(tagId)).length;
}

export function TagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [formState, setFormState] = useState<TagFormState>(emptyTagForm);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const syncVersion = useDataSyncVersion();
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        await refreshData();
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "标签加载失败。");
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

  const editingTag = useMemo(
    () => tags.find((tag) => tag.id === editingTagId),
    [editingTagId, tags]
  );

  const usageMap = useMemo(
    () => new Map(tags.map((tag) => [tag.id, getTagUsageCount(tag.id, topics)])),
    [tags, topics]
  );

  async function refreshData() {
    const [nextTags, nextTopics] = await Promise.all([getTags(), getTopics()]);
    setTags(nextTags);
    setTopics(nextTopics);
  }

  function resetForm() {
    setEditingTagId(null);
    setFormState(emptyTagForm);
    setValidationMessage(null);
  }

  function startEdit(tag: Tag) {
    setEditingTagId(tag.id);
    setFormState(tagToFormState(tag));
    setValidationMessage(null);
  }

  function validateForm() {
    const name = formState.name.trim();

    if (!name) {
      return "标签名称不能为空。";
    }

    if (reservedStatusNames.has(name)) {
      return "状态不能作为普通内容标签。";
    }

    const duplicatedTag = tags.find(
      (tag) => tag.name === name && tag.id !== editingTagId
    );

    if (duplicatedTag) {
      return "标签名称已存在。";
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const validationError = validateForm();

    if (validationError) {
      setValidationMessage(validationError);
      return;
    }

    const payload = {
      name: formState.name.trim(),
      color: formState.color,
      description: formState.description.trim(),
    };

    try {
      if (editingTagId) {
        await updateTag(editingTagId, payload);
      } else {
        await createTag(payload);
      }

      await refreshData();
      resetForm();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "标签保存失败。");
    }
  }

  async function handleDelete(tag: Tag) {
    setErrorMessage(null);
    const usageCount = usageMap.get(tag.id) ?? 0;

    try {
      if (usageCount > 0) {
        await Promise.all(
          topics
            .filter((topic) => topic.tagIds.includes(tag.id))
            .map((topic) =>
              updateTopic(topic.id, {
                tagIds: topic.tagIds.filter((tagId) => tagId !== tag.id),
              })
            )
        );
      }

      await deleteTag(tag.id);
      await refreshData();

      if (editingTagId === tag.id) {
        resetForm();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "标签删除失败。");
    } finally {
      setTagToDelete(null);
    }
  }

  return (
    <main className="space-y-6">
      <Button asChild variant="ghost">
        <Link href="/score">
          <ArrowLeft aria-hidden="true" className="size-4" />
          返回评分
        </Link>
      </Button>

      <PageHeader
        eyebrow="Tags"
        title="标签管理"
        description="维护内容标签；状态仍在选题状态中单独管理。"
      />

      {isLoading ? <LoadingState /> : null}
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {!isLoading ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-3">
            {tags.length > 0 ? (
              tags.map((tag) => {
                const usageCount = usageMap.get(tag.id) ?? 0;
                const isEditing = editingTagId === tag.id;

                return (
                  <article
                    className={cn(
                      "rounded-lg border bg-card p-4 shadow-sm transition",
                      isEditing ? "border-primary" : "border-border"
                    )}
                    key={tag.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-3">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="size-4 rounded-full border border-black/10"
                            style={{ backgroundColor: tag.color }}
                          />
                          <div>
                            <h2 className="text-base font-semibold">{tag.name}</h2>
                            <p className="text-xs text-muted-foreground">
                              {usageCount > 0
                                ? `被 ${usageCount} 个选题使用`
                                : "未被选题使用"}
                            </p>
                          </div>
                        </div>
                        {tag.description ? (
                          <p className="text-sm leading-6 text-muted-foreground">
                            {tag.description}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">暂无描述</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          onClick={() => startEdit(tag)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                          <span className="sr-only">编辑标签</span>
                        </Button>
                        <Button
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setTagToDelete(tag)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                          <span className="sr-only">删除标签</span>
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <EmptyState
                title="暂无标签"
                description="新建标签后，就可以在选题新建或编辑时选择它。"
              />
            )}
          </section>

          <form
            className="h-fit space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm"
            onSubmit={handleSubmit}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                {editingTag ? "编辑标签" : "新建标签"}
              </h2>
              {editingTag ? (
                <Button onClick={resetForm} size="icon" type="button" variant="ghost">
                  <X aria-hidden="true" className="size-4" />
                  <span className="sr-only">取消编辑</span>
                </Button>
              ) : null}
            </div>

            {validationMessage ? <ErrorState message={validationMessage} /> : null}

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="tag-name">
                名称
              </label>
              <input
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="tag-name"
                onChange={(event) =>
                  setFormState((previousState) => ({
                    ...previousState,
                    name: event.target.value,
                  }))
                }
                placeholder="例如：内容策略"
                value={formState.name}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="tag-color">
                颜色
              </label>
              <div className="flex gap-2">
                <input
                  className="h-11 w-14 rounded-md border border-input bg-background p-1"
                  id="tag-color"
                  onChange={(event) =>
                    setFormState((previousState) => ({
                      ...previousState,
                      color: event.target.value,
                    }))
                  }
                  type="color"
                  value={formState.color}
                />
                <input
                  className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) =>
                    setFormState((previousState) => ({
                      ...previousState,
                      color: event.target.value,
                    }))
                  }
                  value={formState.color}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="tag-description">
                描述
              </label>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="tag-description"
                onChange={(event) =>
                  setFormState((previousState) => ({
                    ...previousState,
                    description: event.target.value,
                  }))
                }
                placeholder="说明这个标签适合标记哪类选题"
                value={formState.description}
              />
            </div>

            <Button className="w-full" type="submit">
              {editingTag ? (
                <Save aria-hidden="true" className="size-4" />
              ) : (
                <Plus aria-hidden="true" className="size-4" />
              )}
              {editingTag ? "保存修改" : "新建标签"}
            </Button>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(tagToDelete)}
        onCancel={() => setTagToDelete(null)}
        onConfirm={() => {
          if (tagToDelete) {
            void handleDelete(tagToDelete);
          }
        }}
      />
    </main>
  );
}


