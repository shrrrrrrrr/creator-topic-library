"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/app-shell/empty-state";
import { ErrorState } from "@/components/app-shell/error-state";
import { LoadingState } from "@/components/app-shell/loading-state";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { useDataSyncVersion } from "@/features/sync/data-sync-provider";
import {
  createScoreTemplate,
  getScoreTemplates,
  updateScoreTemplate,
} from "@/lib/data/repository";
import { cn } from "@/lib/utils";
import type { BonusItem, ScoreCriterion, ScoreTemplate } from "@/types/scoring";

type ScoreTemplateFormState = {
  name: string;
  color: string;
  description: string;
  criteria: ScoreCriterion[];
  bonusItems: BonusItem[];
};

const colorPool = [
  "#0f766e",
  "#2563eb",
  "#c2410c",
  "#7c3aed",
  "#be123c",
  "#4d7c0f",
  "#0369a1",
];

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getRandomColor() {
  return colorPool[Math.floor(Math.random() * colorPool.length)];
}

function getNextTemplateName(templates: ScoreTemplate[]) {
  const maxIndex = templates.reduce((maxValue, template) => {
    const match = template.name.match(/^评分模板\s*(\d+)$/);

    if (!match) {
      return maxValue;
    }

    return Math.max(maxValue, Number(match[1]));
  }, 0);

  return `评分模板 ${maxIndex + 1}`;
}

function createDefaultFormState(templates: ScoreTemplate[]): ScoreTemplateFormState {
  return {
    name: getNextTemplateName(templates),
    color: getRandomColor(),
    description: "",
    criteria: [
      {
        id: createId("criterion"),
        description: "",
        weight: 1,
      },
    ],
    bonusItems: [],
  };
}

function templateToFormState(template: ScoreTemplate): ScoreTemplateFormState {
  return {
    name: template.name,
    color: template.color,
    description: template.description ?? "",
    criteria: template.criteria.map((criterion) => ({
      id: criterion.id,
      description: criterion.description,
      weight: criterion.weight,
    })),
    bonusItems: template.bonusItems,
  };
}

function getWeightTotal(criteria: ScoreCriterion[]) {
  return criteria.reduce((total, criterion) => total + Number(criterion.weight || 0), 0);
}

function isValidWeightTotal(total: number) {
  return Math.abs(total - 1) < 0.000000001;
}

function normalizeFormState(state: ScoreTemplateFormState): ScoreTemplateFormState {
  return {
    ...state,
    name: state.name.trim(),
    description: state.description.trim(),
    criteria: state.criteria.map((criterion) => ({
      id: criterion.id,
      description: criterion.description.trim(),
      weight: Number(criterion.weight),
    })),
    bonusItems: state.bonusItems.map((item) => ({
      id: item.id,
      description: item.description.trim(),
      points: Number(item.points),
    })),
  };
}

export function ScoreTemplateManager() {
  const [templates, setTemplates] = useState<ScoreTemplate[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ScoreTemplateFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const syncVersion = useDataSyncVersion();
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const storedTemplates = await getScoreTemplates();

        if (!isMounted) {
          return;
        }

        setTemplates(storedTemplates);
        setFormState(createDefaultFormState(storedTemplates));
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "评分模板加载失败。"
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

  const editingTemplate = useMemo(
    () => templates.find((template) => template.id === editingTemplateId),
    [editingTemplateId, templates]
  );

  const weightTotal = formState ? getWeightTotal(formState.criteria) : 0;
  const weightIsValid = isValidWeightTotal(weightTotal);

  async function refreshTemplates() {
    const storedTemplates = await getScoreTemplates();
    setTemplates(storedTemplates);
    return storedTemplates;
  }

  function resetForm(nextTemplates = templates) {
    setEditingTemplateId(null);
    setFormState(createDefaultFormState(nextTemplates));
    setValidationMessage(null);
  }

  function startEdit(template: ScoreTemplate) {
    setEditingTemplateId(template.id);
    setFormState(templateToFormState(template));
    setValidationMessage(null);
  }

  function updateField<K extends keyof ScoreTemplateFormState>(
    key: K,
    value: ScoreTemplateFormState[K]
  ) {
    setFormState((previousState) =>
      previousState
        ? {
            ...previousState,
            [key]: value,
          }
        : previousState
    );
  }

  function addCriterion() {
    if (!formState) {
      return;
    }

    updateField("criteria", [
      ...formState.criteria,
      {
        id: createId("criterion"),
        description: "",
        weight: 0,
      },
    ]);
  }

  function updateCriterion(id: string, patch: Partial<ScoreCriterion>) {
    if (!formState) {
      return;
    }

    updateField(
      "criteria",
      formState.criteria.map((criterion) =>
        criterion.id === id ? { ...criterion, ...patch } : criterion
      )
    );
  }

  function removeCriterion(id: string) {
    if (!formState) {
      return;
    }

    updateField(
      "criteria",
      formState.criteria.filter((criterion) => criterion.id !== id)
    );
  }

  function addBonusItem() {
    if (!formState) {
      return;
    }

    updateField("bonusItems", [
      ...formState.bonusItems,
      {
        id: createId("bonus"),
        description: "",
        points: 0,
      },
    ]);
  }

  function updateBonusItem(id: string, patch: Partial<BonusItem>) {
    if (!formState) {
      return;
    }

    updateField(
      "bonusItems",
      formState.bonusItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      )
    );
  }

  function removeBonusItem(id: string) {
    if (!formState) {
      return;
    }

    updateField(
      "bonusItems",
      formState.bonusItems.filter((item) => item.id !== id)
    );
  }

  function validateForm(state: ScoreTemplateFormState) {
    if (!state.name) {
      return "模板名称不能为空。";
    }

    if (state.criteria.length === 0) {
      return "至少需要一条评分标准。";
    }

    const invalidCriterion = state.criteria.find(
      (criterion) =>
        !criterion.description ||
        Number.isNaN(criterion.weight) ||
        criterion.weight < 0
    );

    if (invalidCriterion) {
      return "每条评分标准都必须包含描述和非负权重。";
    }

    const total = getWeightTotal(state.criteria);

    if (!isValidWeightTotal(total)) {
      return "评分标准权重总和必须为 1。";
    }

    const invalidBonusItem = state.bonusItems.find(
      (item) => !item.description || Number.isNaN(item.points)
    );

    if (invalidBonusItem) {
      return "每条额外加分项都必须包含描述和加分分数。";
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!formState) {
      return;
    }

    const nextState = normalizeFormState(formState);
    const validationError = validateForm(nextState);

    if (validationError) {
      setValidationMessage(validationError);
      return;
    }

    try {
      if (editingTemplateId) {
        await updateScoreTemplate(editingTemplateId, nextState);
      } else {
        await createScoreTemplate(nextState);
      }

      const nextTemplates = await refreshTemplates();
      resetForm(nextTemplates);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "评分模板保存失败。");
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
        eyebrow="Scoring Rules"
        title="评分标准"
        description="维护评分模板、标准权重和额外加分项。"
      />

      {isLoading ? <LoadingState /> : null}
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {!isLoading && formState ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-3">
            {templates.length > 0 ? (
              templates.map((template) => {
                const total = getWeightTotal(template.criteria);
                const isEditing = editingTemplateId === template.id;

                return (
                  <article
                    className={cn(
                      "rounded-lg border bg-card p-4 shadow-sm transition",
                      isEditing ? "border-primary" : "border-border"
                    )}
                    key={template.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-3">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="size-4 rounded-full border border-black/10"
                            style={{ backgroundColor: template.color }}
                          />
                          <div>
                            <h2 className="text-base font-semibold">{template.name}</h2>
                            <p className="text-xs text-muted-foreground">
                              {template.criteria.length} 条标准 ·{" "}
                              {template.bonusItems.length} 条加分项 · 权重{" "}
                              {total.toFixed(3)}
                            </p>
                          </div>
                        </div>
                        {template.description ? (
                          <p className="text-sm leading-6 text-muted-foreground">
                            {template.description}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">暂无描述</p>
                        )}
                        <div className="space-y-2">
                          {template.criteria.map((criterion) => (
                            <div
                              className="rounded-md bg-muted px-3 py-2 text-sm"
                              key={criterion.id}
                            >
                              <span>{criterion.description}</span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                权重 {criterion.weight}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button
                        onClick={() => startEdit(template)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                        <span className="sr-only">编辑评分模板</span>
                      </Button>
                    </div>
                  </article>
                );
              })
            ) : (
              <EmptyState
                title="暂无评分模板"
                description="新建模板后，就可以在后续选题评分流程中使用。"
              />
            )}
          </section>

          <form
            className="h-fit space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm"
            onSubmit={handleSubmit}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                {editingTemplate ? "编辑模板" : "新建模板"}
              </h2>
              {editingTemplate ? (
                <Button onClick={() => resetForm()} size="icon" type="button" variant="ghost">
                  <X aria-hidden="true" className="size-4" />
                  <span className="sr-only">取消编辑</span>
                </Button>
              ) : null}
            </div>

            {validationMessage ? <ErrorState message={validationMessage} /> : null}

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="template-name">
                名称
              </label>
              <input
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="template-name"
                onChange={(event) => updateField("name", event.target.value)}
                value={formState.name}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="template-color">
                颜色
              </label>
              <div className="flex gap-2">
                <input
                  className="h-11 w-14 rounded-md border border-input bg-background p-1"
                  id="template-color"
                  onChange={(event) => updateField("color", event.target.value)}
                  type="color"
                  value={formState.color}
                />
                <input
                  className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => updateField("color", event.target.value)}
                  value={formState.color}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="template-description">
                描述
              </label>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="template-description"
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="说明这个模板适合什么类型的选题"
                value={formState.description}
              />
            </div>

            <section className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">评分标准</h3>
                  <p
                    className={cn(
                      "text-xs",
                      weightIsValid ? "text-muted-foreground" : "text-destructive"
                    )}
                  >
                    当前权重总和 {weightTotal.toFixed(3)}
                  </p>
                </div>
                <Button onClick={addCriterion} size="sm" type="button" variant="secondary">
                  <Plus aria-hidden="true" className="size-4" />
                  添加
                </Button>
              </div>

              <div className="space-y-3">
                {formState.criteria.map((criterion) => (
                  <div className="space-y-2 rounded-md bg-muted p-3" key={criterion.id}>
                    <textarea
                      className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      onChange={(event) =>
                        updateCriterion(criterion.id, {
                          description: event.target.value,
                        })
                      }
                      placeholder="评分标准描述"
                      value={criterion.description}
                    />
                    <div className="flex gap-2">
                      <input
                        className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        min={0}
                        onChange={(event) =>
                          updateCriterion(criterion.id, {
                            weight: Number(event.target.value),
                          })
                        }
                        placeholder="权重"
                        step="0.001"
                        type="number"
                        value={criterion.weight}
                      />
                      <Button
                        onClick={() => removeCriterion(criterion.id)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                        <span className="sr-only">删除评分标准</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">额外加分项</h3>
                <Button onClick={addBonusItem} size="sm" type="button" variant="secondary">
                  <Plus aria-hidden="true" className="size-4" />
                  添加
                </Button>
              </div>

              {formState.bonusItems.length > 0 ? (
                <div className="space-y-3">
                  {formState.bonusItems.map((item) => (
                    <div className="space-y-2 rounded-md bg-muted p-3" key={item.id}>
                      <textarea
                        className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        onChange={(event) =>
                          updateBonusItem(item.id, {
                            description: event.target.value,
                          })
                        }
                        placeholder="加分项描述"
                        value={item.description}
                      />
                      <div className="flex gap-2">
                        <input
                          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                          onChange={(event) =>
                            updateBonusItem(item.id, {
                              points: Number(event.target.value),
                            })
                          }
                          placeholder="加分分数"
                          step="0.1"
                          type="number"
                          value={item.points}
                        />
                        <Button
                          onClick={() => removeBonusItem(item.id)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                          <span className="sr-only">删除加分项</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">暂无额外加分项</p>
              )}
            </section>

            <Button className="w-full" type="submit">
              {editingTemplate ? (
                <Save aria-hidden="true" className="size-4" />
              ) : (
                <Plus aria-hidden="true" className="size-4" />
              )}
              {editingTemplate ? "保存修改" : "新建模板"}
            </Button>
          </form>
        </div>
      ) : null}
    </main>
  );
}


