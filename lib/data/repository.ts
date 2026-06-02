import * as localStore from "@/lib/storage/app-storage";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Review } from "@/types/review";
import type { SearchHistory, SearchScope } from "@/types/search";
import type { ScoreRecord, ScoreTemplate } from "@/types/scoring";
import type { ThemeColor, UserSettings } from "@/types/settings";
import type { Tag } from "@/types/tag";
import type { ToolboxIcon } from "@/types/toolbox";
import type { Topic } from "@/types/topic";

type StoredEntity = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

type CreateInput<T extends StoredEntity> = Omit<T, "id" | "createdAt" | "updatedAt"> &
  Partial<Pick<T, "id" | "createdAt" | "updatedAt">>;

type UpdateInput<T extends StoredEntity> = Partial<Omit<T, "id" | "createdAt">>;

const themeColors = new Set<ThemeColor>([
  "red",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "purple",
  "light",
  "dark",
]);

function normalizeThemeColor(value: unknown, fallback: ThemeColor): ThemeColor {
  return typeof value === "string" && themeColors.has(value as ThemeColor)
    ? (value as ThemeColor)
    : fallback;
}

async function shouldUseSupabase() {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("请先登录后再访问云端数据。");
  }

  return true;
}

async function getCurrentUserId() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("请先登录后再访问云端数据。");
  }

  return data.user.id;
}

function mapTopicFromDb(row: Record<string, unknown>): Topic {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    headings: (row.headings ?? []) as Topic["headings"],
    description: String(row.description ?? ""),
    tagIds: ((row.tag_ids ?? []) as string[]).map(String),
    status: row.status as Topic["status"],
    referenceLinks: (row.reference_links ?? []) as Topic["referenceLinks"],
    materialLinks: (row.material_links ?? []) as Topic["materialLinks"],
    latestScoreRecordId: row.latest_score_record_id
      ? String(row.latest_score_record_id)
      : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapTopicToDb(
  input: CreateInput<Topic> | UpdateInput<Topic>,
  userId?: string
) {
  return {
    ...(userId ? { user_id: userId } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.headings !== undefined ? { headings: input.headings } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.tagIds !== undefined ? { tag_ids: input.tagIds } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.referenceLinks !== undefined
      ? { reference_links: input.referenceLinks }
      : {}),
    ...(input.materialLinks !== undefined ? { material_links: input.materialLinks } : {}),
    ...(input.latestScoreRecordId !== undefined
      ? { latest_score_record_id: input.latestScoreRecordId ?? null }
      : {}),
  };
}

function mapTagFromDb(row: Record<string, unknown>): Tag {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    color: String(row.color ?? ""),
    description: row.description ? String(row.description) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapTagToDb(input: CreateInput<Tag> | UpdateInput<Tag>, userId?: string) {
  return {
    ...(userId ? { user_id: userId } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.color !== undefined ? { color: input.color } : {}),
    ...(input.description !== undefined ? { description: input.description ?? null } : {}),
  };
}

function mapScoreTemplateFromDb(row: Record<string, unknown>): ScoreTemplate {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    color: String(row.color ?? ""),
    description: row.description ? String(row.description) : undefined,
    criteria: (row.criteria ?? []) as ScoreTemplate["criteria"],
    bonusItems: (row.bonus_items ?? []) as ScoreTemplate["bonusItems"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapScoreTemplateToDb(
  input: CreateInput<ScoreTemplate> | UpdateInput<ScoreTemplate>,
  userId?: string
) {
  return {
    ...(userId ? { user_id: userId } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.color !== undefined ? { color: input.color } : {}),
    ...(input.description !== undefined ? { description: input.description ?? null } : {}),
    ...(input.criteria !== undefined ? { criteria: input.criteria } : {}),
    ...(input.bonusItems !== undefined ? { bonus_items: input.bonusItems } : {}),
  };
}

function mapScoreRecordFromDb(row: Record<string, unknown>): ScoreRecord {
  return {
    id: String(row.id),
    topicId: String(row.topic_id),
    templateId: String(row.template_id ?? ""),
    criterionScores: (row.criterion_scores ?? []) as ScoreRecord["criterionScores"],
    bonusItemIds: ((row.bonus_item_ids ?? []) as string[]).map(String),
    customBonusItems: (row.custom_bonus_items ?? []) as ScoreRecord["customBonusItems"],
    totalScore: Number(row.total_score ?? 0),
    level: row.level as ScoreRecord["level"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapScoreRecordToDb(
  input: CreateInput<ScoreRecord> | UpdateInput<ScoreRecord>,
  userId?: string
) {
  return {
    ...(userId ? { user_id: userId } : {}),
    ...(input.topicId !== undefined ? { topic_id: input.topicId } : {}),
    ...(input.templateId !== undefined ? { template_id: input.templateId } : {}),
    ...(input.criterionScores !== undefined
      ? { criterion_scores: input.criterionScores }
      : {}),
    ...(input.bonusItemIds !== undefined ? { bonus_item_ids: input.bonusItemIds } : {}),
    ...(input.customBonusItems !== undefined
      ? { custom_bonus_items: input.customBonusItems ?? [] }
      : {}),
    ...(input.totalScore !== undefined ? { total_score: input.totalScore } : {}),
    ...(input.level !== undefined ? { level: input.level } : {}),
  };
}

function mapReviewFromDb(row: Record<string, unknown>): Review {
  return {
    id: String(row.id),
    topicId: row.topic_id ? String(row.topic_id) : null,
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    headings: (row.headings ?? []) as Review["headings"],
    contentBlocks: (row.content_blocks ?? []) as Review["contentBlocks"],
    imageLinks: (row.image_links ?? []) as Review["imageLinks"],
    normalLinks: (row.normal_links ?? []) as Review["normalLinks"],
    dataDashboardLinks: (row.data_dashboard_links ?? []) as Review["dataDashboardLinks"],
    platform: String(row.platform ?? ""),
    publishedAt: row.published_at ? String(row.published_at) : "",
    readOrPlayCount: Number(row.read_or_play_count ?? 0),
    likeCount: Number(row.like_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    favoriteCount: Number(row.favorite_count ?? 0),
    shareCount: Number(row.share_count ?? 0),
    followerGrowth: Number(row.follower_growth ?? 0),
    conversionResult: String(row.conversion_result ?? ""),
    summary: String(row.summary ?? ""),
    nextImprovement: String(row.next_improvement ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapReviewToDb(
  input: CreateInput<Review> | UpdateInput<Review>,
  userId?: string
) {
  return {
    ...(userId ? { user_id: userId } : {}),
    ...(input.topicId !== undefined ? { topic_id: input.topicId } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.body !== undefined ? { body: input.body } : {}),
    ...(input.headings !== undefined ? { headings: input.headings } : {}),
    ...(input.contentBlocks !== undefined
      ? { content_blocks: input.contentBlocks }
      : {}),
    ...(input.imageLinks !== undefined ? { image_links: input.imageLinks } : {}),
    ...(input.normalLinks !== undefined ? { normal_links: input.normalLinks } : {}),
    ...(input.dataDashboardLinks !== undefined
      ? { data_dashboard_links: input.dataDashboardLinks }
      : {}),
    ...(input.platform !== undefined ? { platform: input.platform } : {}),
    ...(input.publishedAt !== undefined
      ? { published_at: input.publishedAt || null }
      : {}),
    ...(input.readOrPlayCount !== undefined
      ? { read_or_play_count: input.readOrPlayCount }
      : {}),
    ...(input.likeCount !== undefined ? { like_count: input.likeCount } : {}),
    ...(input.commentCount !== undefined ? { comment_count: input.commentCount } : {}),
    ...(input.favoriteCount !== undefined
      ? { favorite_count: input.favoriteCount }
      : {}),
    ...(input.shareCount !== undefined ? { share_count: input.shareCount } : {}),
    ...(input.followerGrowth !== undefined
      ? { follower_growth: input.followerGrowth }
      : {}),
    ...(input.conversionResult !== undefined
      ? { conversion_result: input.conversionResult }
      : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    ...(input.nextImprovement !== undefined
      ? { next_improvement: input.nextImprovement }
      : {}),
  };
}

function mapToolboxIconFromDb(row: Record<string, unknown>): ToolboxIcon {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    url: String(row.url ?? ""),
    coverType: row.cover_type as ToolboxIcon["coverType"],
    coverColor: row.cover_color ? String(row.cover_color) : undefined,
    coverImageUrl: row.cover_image_url ? String(row.cover_image_url) : undefined,
    x: Number(row.x ?? 0),
    y: Number(row.y ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapToolboxIconToDb(
  input: CreateInput<ToolboxIcon> | UpdateInput<ToolboxIcon>,
  userId?: string
) {
  return {
    ...(userId ? { user_id: userId } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.url !== undefined ? { url: input.url } : {}),
    ...(input.coverType !== undefined ? { cover_type: input.coverType } : {}),
    ...(input.coverColor !== undefined ? { cover_color: input.coverColor ?? null } : {}),
    ...(input.coverImageUrl !== undefined
      ? { cover_image_url: input.coverImageUrl ?? null }
      : {}),
    ...(input.x !== undefined ? { x: input.x } : {}),
    ...(input.y !== undefined ? { y: input.y } : {}),
  };
}

export async function getTopics() {
  if (!(await shouldUseSupabase())) {
    return localStore.getTopics();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapTopicFromDb(row));
}

export async function createTopic(input: CreateInput<Topic>) {
  if (!(await shouldUseSupabase())) {
    return localStore.createTopic(input);
  }

  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("topics")
    .insert(mapTopicToDb(input, userId))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapTopicFromDb(data);
}

export async function updateTopic(id: string, input: UpdateInput<Topic>) {
  if (!(await shouldUseSupabase())) {
    return localStore.updateTopic(id, input);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("topics")
    .update(mapTopicToDb(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapTopicFromDb(data);
}

export async function deleteTopic(id: string) {
  if (!(await shouldUseSupabase())) {
    return localStore.deleteTopic(id);
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("topics").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function getTags() {
  if (!(await shouldUseSupabase())) {
    return localStore.getTags();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapTagFromDb(row));
}

export async function createTag(input: CreateInput<Tag>) {
  if (!(await shouldUseSupabase())) {
    return localStore.createTag(input);
  }

  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tags")
    .insert(mapTagToDb(input, userId))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapTagFromDb(data);
}

export async function updateTag(id: string, input: UpdateInput<Tag>) {
  if (!(await shouldUseSupabase())) {
    return localStore.updateTag(id, input);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tags")
    .update(mapTagToDb(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapTagFromDb(data);
}

export async function deleteTag(id: string) {
  if (!(await shouldUseSupabase())) {
    return localStore.deleteTag(id);
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function getScoreTemplates() {
  if (!(await shouldUseSupabase())) {
    return localStore.getScoreTemplates();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("score_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapScoreTemplateFromDb(row));
}

export async function createScoreTemplate(input: CreateInput<ScoreTemplate>) {
  if (!(await shouldUseSupabase())) {
    return localStore.createScoreTemplate(input);
  }

  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("score_templates")
    .insert(mapScoreTemplateToDb(input, userId))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapScoreTemplateFromDb(data);
}

export async function updateScoreTemplate(
  id: string,
  input: UpdateInput<ScoreTemplate>
) {
  if (!(await shouldUseSupabase())) {
    return localStore.updateScoreTemplate(id, input);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("score_templates")
    .update(mapScoreTemplateToDb(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapScoreTemplateFromDb(data);
}

export async function getScoreRecords() {
  if (!(await shouldUseSupabase())) {
    return localStore.getScoreRecords();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("score_records")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapScoreRecordFromDb(row));
}

export async function createScoreRecord(input: CreateInput<ScoreRecord>) {
  if (!(await shouldUseSupabase())) {
    return localStore.createScoreRecord(input);
  }

  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("score_records")
    .insert(mapScoreRecordToDb(input, userId))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapScoreRecordFromDb(data);
}

export async function updateScoreRecord(id: string, input: UpdateInput<ScoreRecord>) {
  if (!(await shouldUseSupabase())) {
    return localStore.updateScoreRecord(id, input);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("score_records")
    .update(mapScoreRecordToDb(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapScoreRecordFromDb(data);
}

export async function getReviews() {
  if (!(await shouldUseSupabase())) {
    return localStore.getReviews();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapReviewFromDb(row));
}

export async function createReview(input: CreateInput<Review>) {
  if (!(await shouldUseSupabase())) {
    return localStore.createReview(input);
  }

  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("reviews")
    .insert(mapReviewToDb(input, userId))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapReviewFromDb(data);
}

export async function updateReview(id: string, input: UpdateInput<Review>) {
  if (!(await shouldUseSupabase())) {
    return localStore.updateReview(id, input);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("reviews")
    .update(mapReviewToDb(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapReviewFromDb(data);
}

export async function getToolboxIcons() {
  if (!(await shouldUseSupabase())) {
    return localStore.getToolboxIcons();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("toolbox_icons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapToolboxIconFromDb(row));
}

export async function createToolboxIcon(input: CreateInput<ToolboxIcon>) {
  if (!(await shouldUseSupabase())) {
    return localStore.createToolboxIcon(input);
  }

  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("toolbox_icons")
    .insert(mapToolboxIconToDb(input, userId))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapToolboxIconFromDb(data);
}

export async function updateToolboxIcon(
  id: string,
  input: UpdateInput<ToolboxIcon>
) {
  if (!(await shouldUseSupabase())) {
    return localStore.updateToolboxIcon(id, input);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("toolbox_icons")
    .update(mapToolboxIconToDb(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapToolboxIconFromDb(data);
}

export async function deleteToolboxIcon(id: string) {
  if (!(await shouldUseSupabase())) {
    return localStore.deleteToolboxIcon(id);
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("toolbox_icons").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function getSearchHistory(scope: SearchScope) {
  return localStore.getSearchHistory(scope);
}

export async function saveSearchHistory(scope: SearchScope, keyword: string) {
  return localStore.saveSearchHistory(scope, keyword);
}

export async function getUserSettings() {
  if (!(await shouldUseSupabase())) {
    return localStore.getUserSettings();
  }

  const userId = await getCurrentUserId();
  const localSettings = localStore.getUserSettings();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return localSettings;
  }

  return {
    ...localSettings,
    themeColor: normalizeThemeColor(data.accent_color, localSettings.themeColor),
    toolboxWallpaperUrl: data.toolbox_wallpaper_url
      ? String(data.toolbox_wallpaper_url)
      : localSettings.toolboxWallpaperUrl,
  };
}

export async function updateUserSettings(input: Partial<UserSettings>) {
  const currentSettings = localStore.updateUserSettings(input);

  if (!(await shouldUseSupabase())) {
    return currentSettings;
  }

  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      theme_mode: currentSettings.themeColor === "dark" ? "dark" : "light",
      accent_color: currentSettings.themeColor,
      toolbox_wallpaper_url: currentSettings.toolboxWallpaperUrl ?? null,
      remember_login_preference: true,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw error;
  }

  return currentSettings;
}

export type { CreateInput, SearchHistory, UpdateInput };
