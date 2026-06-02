import { STORAGE_KEYS } from "@/lib/constants";
import {
  createReview,
  createScoreRecord,
  createScoreTemplate,
  createTag,
  createTopic,
  updateTopic,
} from "@/lib/data/repository";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Review } from "@/types/review";
import type { ScoreRecord, ScoreTemplate } from "@/types/scoring";
import type { Tag } from "@/types/tag";
import type { Topic } from "@/types/topic";

const MIGRATION_DONE_KEY_PREFIX = "media-tool.migration.v1.done";

type LegacyData = {
  topics: Topic[];
  tags: Tag[];
  scoreTemplates: ScoreTemplate[];
  scoreRecords: ScoreRecord[];
  reviews: Review[];
};

function readLegacyCollection<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.localStorage.getItem(key);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    return Array.isArray(parsedValue) ? (parsedValue as T[]) : [];
  } catch {
    return [];
  }
}

export function getMigrationDoneKey(userId: string) {
  return `${MIGRATION_DONE_KEY_PREFIX}.${userId}`;
}

export function isLocalDataMigrationDone(userId: string) {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(getMigrationDoneKey(userId)) === "true";
}

export function markLocalDataMigrationDone(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getMigrationDoneKey(userId), "true");
}

export function readLegacyLocalData(): LegacyData {
  return {
    topics: readLegacyCollection<Topic>(STORAGE_KEYS.topics),
    tags: readLegacyCollection<Tag>(STORAGE_KEYS.tags),
    scoreTemplates: readLegacyCollection<ScoreTemplate>(
      STORAGE_KEYS.scoreTemplates
    ),
    scoreRecords: readLegacyCollection<ScoreRecord>(STORAGE_KEYS.scoreRecords),
    reviews: readLegacyCollection<Review>(STORAGE_KEYS.reviews),
  };
}

export function hasLegacyLocalData() {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const legacyData = readLegacyLocalData();

  return (
    legacyData.topics.length > 0 ||
    legacyData.tags.length > 0 ||
    legacyData.scoreTemplates.length > 0 ||
    legacyData.scoreRecords.length > 0 ||
    legacyData.reviews.length > 0
  );
}

export async function importLegacyLocalDataToCurrentUser(userId: string) {
  const legacyData = readLegacyLocalData();
  const tagIdMap = new Map<string, string>();
  const templateIdMap = new Map<string, string>();
  const topicIdMap = new Map<string, string>();
  const scoreRecordIdMap = new Map<string, string>();

  for (const tag of legacyData.tags) {
    const createdTag = await createTag({
      name: tag.name,
      color: tag.color,
      description: tag.description,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    });

    tagIdMap.set(tag.id, createdTag.id);
  }

  for (const template of legacyData.scoreTemplates) {
    const createdTemplate = await createScoreTemplate({
      name: template.name,
      color: template.color,
      description: template.description,
      criteria: template.criteria,
      bonusItems: template.bonusItems,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    });

    templateIdMap.set(template.id, createdTemplate.id);
  }

  for (const topic of legacyData.topics) {
    const createdTopic = await createTopic({
      title: topic.title,
      headings: topic.headings,
      description: topic.description,
      tagIds: topic.tagIds
        .map((tagId) => tagIdMap.get(tagId))
        .filter((tagId): tagId is string => Boolean(tagId)),
      status: topic.status,
      referenceLinks: topic.referenceLinks,
      materialLinks: topic.materialLinks,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    });

    topicIdMap.set(topic.id, createdTopic.id);
  }

  for (const scoreRecord of legacyData.scoreRecords) {
    const topicId = topicIdMap.get(scoreRecord.topicId);
    const templateId = templateIdMap.get(scoreRecord.templateId);

    if (!topicId || !templateId) {
      continue;
    }

    const createdScoreRecord = await createScoreRecord({
      topicId,
      templateId,
      criterionScores: scoreRecord.criterionScores,
      bonusItemIds: scoreRecord.bonusItemIds,
      customBonusItems: scoreRecord.customBonusItems ?? [],
      totalScore: scoreRecord.totalScore,
      level: scoreRecord.level,
      createdAt: scoreRecord.createdAt,
      updatedAt: scoreRecord.updatedAt,
    });

    scoreRecordIdMap.set(scoreRecord.id, createdScoreRecord.id);
  }

  await Promise.all(
    legacyData.topics.map((topic) => {
      const topicId = topicIdMap.get(topic.id);
      const latestScoreRecordId = topic.latestScoreRecordId
        ? scoreRecordIdMap.get(topic.latestScoreRecordId)
        : undefined;

      if (!topicId || !latestScoreRecordId) {
        return Promise.resolve();
      }

      return updateTopic(topicId, { latestScoreRecordId });
    })
  );

  for (const review of legacyData.reviews) {
    await createReview({
      topicId: review.topicId ? topicIdMap.get(review.topicId) ?? null : null,
      title: review.title,
      body: review.body,
      headings: review.headings,
      contentBlocks: review.contentBlocks,
      imageLinks: review.imageLinks,
      normalLinks: review.normalLinks,
      dataDashboardLinks: review.dataDashboardLinks,
      platform: review.platform,
      publishedAt: review.publishedAt,
      readOrPlayCount: review.readOrPlayCount,
      likeCount: review.likeCount,
      commentCount: review.commentCount,
      favoriteCount: review.favoriteCount,
      shareCount: review.shareCount,
      followerGrowth: review.followerGrowth,
      conversionResult: review.conversionResult,
      summary: review.summary,
      nextImprovement: review.nextImprovement,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    });
  }

  markLocalDataMigrationDone(userId);

  return {
    topics: topicIdMap.size,
    tags: tagIdMap.size,
    scoreTemplates: templateIdMap.size,
    scoreRecords: scoreRecordIdMap.size,
    reviews: legacyData.reviews.length,
  };
}
