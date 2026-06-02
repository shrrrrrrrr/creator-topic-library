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
import {
  createScoreRecord,
  getScoreRecords,
  getScoreTemplates,
  getTopics,
  updateScoreRecord,
  updateTopic,
} from "@/lib/data/repository";
import { cn } from "@/lib/utils";
import type {
  BonusItem,
  CriterionScore,
  ScoreLevel,
  ScoreRecord,
  ScoreTemplate,
} from "@/types/scoring";
import type { Topic } from "@/types/topic";

type CustomBonusDraft = {
  id: string;
  description: string;
  points: number;
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function getScoreLevel(totalScore: number): ScoreLevel {
  if (totalScore >= 90) {
    return "S";
  }

  if (totalScore >= 75) {
    return "A";
  }

  if (totalScore >= 60) {
    return "B";
  }

  return "C";
}

function clampScore(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function getCriterionScore(
  criterionId: string,
  criterionScores: CriterionScore[]
) {
  return criterionScores.find((item) => item.criterionId === criterionId)?.score ?? 0;
}

function calculateBaseScore(
  template: ScoreTemplate | undefined,
  criterionScores: CriterionScore[]
) {
  if (!template) {
    return 0;
  }

  return template.criteria.reduce((total, criterion) => {
    const score = getCriterionScore(criterion.id, criterionScores);

    return total + score * criterion.weight;
  }, 0);
}

function calculateSelectedBonus(template: ScoreTemplate | undefined, bonusItemIds: string[]) {
  if (!template) {
    return 0;
  }

  return template.bonusItems
    .filter((item) => bonusItemIds.includes(item.id))
    .reduce((total, item) => total + Number(item.points || 0), 0);
}

function calculateCustomBonus(customBonusItems: CustomBonusDraft[]) {
  return customBonusItems.reduce((total, item) => total + Number(item.points || 0), 0);
}

export function TopicScoringForm() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [templates, setTemplates] = useState<ScoreTemplate[]>([]);
  const [scoreRecords, setScoreRecords] = useState<ScoreRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [criterionScores, setCriterionScores] = useState<CriterionScore[]>([]);
  const [selectedBonusItemIds, setSelectedBonusItemIds] = useState<string[]>([]);
  const [customBonusItems, setCustomBonusItems] = useState<CustomBonusDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [storedTopics, storedTemplates, storedScoreRecords] =
          await Promise.all([getTopics(), getScoreTemplates(), getScoreRecords()]);
        const currentTopic =
          storedTopics.find((item) => item.id === params.id) ?? null;

        if (!isMounted) {
          return;
        }

        setTopic(currentTopic);
        setTemplates(storedTemplates);
        setScoreRecords(storedScoreRecords);

        if (currentTopic) {
          const latestRecord = getTopicScoreRecord(currentTopic, storedScoreRecords);
          const fallbackTemplateId = storedTemplates[0]?.id ?? "";
          const initialTemplateId = latestRecord?.templateId ?? fallbackTemplateId;

          setSelectedTemplateId(initialTemplateId);

          if (latestRecord) {
            setCriterionScores(latestRecord.criterionScores);
            setSelectedBonusItemIds(latestRecord.bonusItemIds);
            setCustomBonusItems(latestRecord.customBonusItems ?? []);
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "评分页面加载失败。");
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
  }, [params.id]);

  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId
  );

  const existingRecordForTemplate = useMemo(() => {
    if (!topic || !selectedTemplate) {
      return undefined;
    }

    return scoreRecords.find(
      (record) => record.topicId === topic.id && record.templateId === selectedTemplate.id
    );
  }, [scoreRecords, selectedTemplate, topic]);

  const baseScore = calculateBaseScore(selectedTemplate, criterionScores);
  const selectedBonusScore = calculateSelectedBonus(
    selectedTemplate,
    selectedBonusItemIds
  );
  const customBonusScore = calculateCustomBonus(customBonusItems);
  const totalScore = baseScore + selectedBonusScore + customBonusScore;
  const scoreLevel = getScoreLevel(totalScore);

  function handleTemplateChange(templateId: string) {
    const nextTemplate = templates.find((template) => template.id === templateId);
    const nextExistingRecord =
      topic &&
      scoreRecords.find(
        (record) => record.topicId === topic.id && record.templateId === templateId
      );

    setSelectedTemplateId(templateId);

    if (nextExistingRecord) {
      setCriterionScores(nextExistingRecord.criterionScores);
      setSelectedBonusItemIds(nextExistingRecord.bonusItemIds);
      setCustomBonusItems(nextExistingRecord.customBonusItems ?? []);
      return;
    }

    setCriterionScores(
      nextTemplate?.criteria.map((criterion) => ({
        criterionId: criterion.id,
        score: 0,
      })) ?? []
    );
    setSelectedBonusItemIds([]);
    setCustomBonusItems([]);
  }

  function updateCriterionScore(criterionId: string, score: number) {
    const nextScore = clampScore(score);

    setCriterionScores((previousScores) => {
      const hasScore = previousScores.some((item) => item.criterionId === criterionId);

      if (!hasScore) {
        return [...previousScores, { criterionId, score: nextScore }];
      }

      return previousScores.map((item) =>
        item.criterionId === criterionId ? { ...item, score: nextScore } : item
      );
    });
  }

  function toggleBonusItem(bonusItemId: string) {
    setSelectedBonusItemIds((previousIds) =>
      previousIds.includes(bonusItemId)
        ? previousIds.filter((id) => id !== bonusItemId)
        : [...previousIds, bonusItemId]
    );
  }

  function addCustomBonusItem() {
    setCustomBonusItems((previousItems) => [
      ...previousItems,
      {
        id: createId("custom-bonus"),
        description: "",
        points: 0,
      },
    ]);
  }

  function updateCustomBonusItem(id: string, patch: Partial<CustomBonusDraft>) {
    setCustomBonusItems((previousItems) =>
      previousItems.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function removeCustomBonusItem(id: string) {
    setCustomBonusItems((previousItems) =>
      previousItems.filter((item) => item.id !== id)
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setValidationMessage(null);

    if (!topic) {
      setValidationMessage("没有找到要评分的选题。");
      return;
    }

    if (!selectedTemplate) {
      setValidationMessage("请选择评分模板。");
      return;
    }

    const normalizedCriterionScores = selectedTemplate.criteria.map((criterion) => ({
      criterionId: criterion.id,
      score: clampScore(getCriterionScore(criterion.id, criterionScores)),
    }));
    const normalizedCustomBonusItems: BonusItem[] = customBonusItems
      .map((item) => ({
        id: item.id,
        description: item.description.trim(),
        points: Number(item.points),
      }))
      .filter((item) => item.description.length > 0 || item.points !== 0);

    const invalidCustomBonusItem = normalizedCustomBonusItems.find(
      (item) => !item.description || Number.isNaN(item.points)
    );

    if (invalidCustomBonusItem) {
      setValidationMessage("额外加分项需要填写描述和有效分数。");
      return;
    }

    const nextBaseScore = calculateBaseScore(
      selectedTemplate,
      normalizedCriterionScores
    );
    const nextSelectedBonusScore = calculateSelectedBonus(
      selectedTemplate,
      selectedBonusItemIds
    );
    const nextCustomBonusScore = normalizedCustomBonusItems.reduce(
      (total, item) => total + item.points,
      0
    );
    const nextTotalScore =
      nextBaseScore + nextSelectedBonusScore + nextCustomBonusScore;
    const payload = {
      topicId: topic.id,
      templateId: selectedTemplate.id,
      criterionScores: normalizedCriterionScores,
      bonusItemIds: selectedBonusItemIds,
      customBonusItems: normalizedCustomBonusItems,
      totalScore: Number(nextTotalScore.toFixed(2)),
      level: getScoreLevel(nextTotalScore),
    };

    try {
      const savedRecord = existingRecordForTemplate
        ? await updateScoreRecord(existingRecordForTemplate.id, payload)
        : await createScoreRecord(payload);

      await updateTopic(topic.id, {
        latestScoreRecordId: savedRecord.id,
      });
      router.push("/");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "评分保存失败。");
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

      {isLoading ? <LoadingState /> : null}
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {!isLoading && !errorMessage && !topic ? (
        <EmptyState title="没有找到选题" description="该选题可能已被删除或不存在。" />
      ) : null}

      {!isLoading && !errorMessage && topic ? (
        <>
          <PageHeader
            eyebrow="Topic Scoring"
            title={topic.title}
            description={topic.description || "为这个选题选择模板并完成评分。"}
          />

          {templates.length === 0 ? (
            <EmptyState
              title="暂无评分模板"
              description="请先到评分标准页面新建模板，再回来为选题评分。"
            />
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {validationMessage ? <ErrorState message={validationMessage} /> : null}

              <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
                <label className="text-sm font-medium" htmlFor="score-template">
                  评分模板
                </label>
                <select
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="score-template"
                  onChange={(event) => handleTemplateChange(event.target.value)}
                  value={selectedTemplateId}
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {selectedTemplate?.description ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                ) : null}
              </section>

              {selectedTemplate ? (
                <>
                  <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-base font-semibold">评分标准</h2>
                      <p className="text-xs text-muted-foreground">
                        基础分 {baseScore.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {selectedTemplate.criteria.map((criterion) => {
                        const score = getCriterionScore(
                          criterion.id,
                          criterionScores
                        );

                        return (
                          <div
                            className="space-y-3 rounded-lg border border-border bg-background p-3"
                            key={criterion.id}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">
                                  {criterion.description}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  权重 {criterion.weight}
                                </p>
                              </div>
                              <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                                {(score * criterion.weight).toFixed(2)}
                              </span>
                            </div>
                            <input
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                              max={100}
                              min={0}
                              onChange={(event) =>
                                updateCriterionScore(
                                  criterion.id,
                                  Number(event.target.value)
                                )
                              }
                              step="1"
                              type="number"
                              value={score}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-base font-semibold">额外加分</h2>
                      <p className="text-xs text-muted-foreground">
                        加分 {(selectedBonusScore + customBonusScore).toFixed(2)}
                      </p>
                    </div>

                    {selectedTemplate.bonusItems.length > 0 ? (
                      <div className="space-y-2">
                        {selectedTemplate.bonusItems.map((item) => (
                          <label
                            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm"
                            key={item.id}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <input
                                checked={selectedBonusItemIds.includes(item.id)}
                                className="size-4 accent-primary"
                                onChange={() => toggleBonusItem(item.id)}
                                type="checkbox"
                              />
                              <span className="min-w-0">{item.description}</span>
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              +{item.points}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        当前模板没有预设加分项。
                      </p>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">自定义加分项</h3>
                        <Button
                          onClick={addCustomBonusItem}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <Plus aria-hidden="true" className="size-4" />
                          添加
                        </Button>
                      </div>
                      {customBonusItems.length > 0 ? (
                        customBonusItems.map((item) => (
                          <div
                            className="space-y-2 rounded-lg border border-border bg-background p-3"
                            key={item.id}
                          >
                            <textarea
                              className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                              onChange={(event) =>
                                updateCustomBonusItem(item.id, {
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
                                  updateCustomBonusItem(item.id, {
                                    points: Number(event.target.value),
                                  })
                                }
                                placeholder="加分分数"
                                step="0.1"
                                type="number"
                                value={item.points}
                              />
                              <Button
                                onClick={() => removeCustomBonusItem(item.id)}
                                size="icon"
                                type="button"
                                variant="ghost"
                              >
                                <Trash2 aria-hidden="true" className="size-4" />
                                <span className="sr-only">删除自定义加分项</span>
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          暂无自定义加分项
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="sticky bottom-20 z-10 rounded-lg border border-border bg-card/95 p-4 shadow-sm backdrop-blur">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">总分</p>
                        <p
                          className={cn(
                            "text-3xl font-semibold",
                            scoreLevel === "S" && "text-emerald-700",
                            scoreLevel === "A" && "text-sky-700",
                            scoreLevel === "B" && "text-amber-700",
                            scoreLevel === "C" && "text-orange-700"
                          )}
                        >
                          {totalScore.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {topic.status === "completed" || topic.status === "reviewed"
                            ? "已完成选题在选题库中不按分数分级"
                            : `${scoreLevel} 级`}
                        </p>
                      </div>
                      <Button type="submit">
                        <Save aria-hidden="true" className="size-4" />
                        保存评分
                      </Button>
                    </div>
                  </section>
                </>
              ) : null}
            </form>
          )}
        </>
      ) : null}
    </main>
  );
}

