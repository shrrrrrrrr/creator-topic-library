import { seedData } from "@/data/seed";
import { STORAGE_KEYS } from "@/lib/constants";
import type { Review } from "@/types/review";
import type { SearchHistory, SearchScope } from "@/types/search";
import type { ScoreRecord, ScoreTemplate } from "@/types/scoring";
import type { UserSettings } from "@/types/settings";
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

const STORE_ERROR_MESSAGE = "本地数据读写失败，请稍后重试。";
const ACTIVE_STORAGE_USER_ID_KEY = "media-tool.auth.activeUserId";

function assertClientStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("localStorage is only available in the browser.");
  }
}

function cloneCollection<T>(items: T[]): T[] {
  return items.map((item) => ({ ...item }));
}

function createStorageError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return new Error(`${STORE_ERROR_MESSAGE} ${message}`);
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function setActiveStorageUserId(userId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!userId) {
    window.localStorage.removeItem(ACTIVE_STORAGE_USER_ID_KEY);
    return;
  }

  window.localStorage.setItem(ACTIVE_STORAGE_USER_ID_KEY, userId);
}

function getScopedStorageKey(key: string) {
  if (typeof window === "undefined") {
    return key;
  }

  const activeUserId = window.localStorage.getItem(ACTIVE_STORAGE_USER_ID_KEY);

  return activeUserId ? `${key}.${activeUserId}` : key;
}

function readCollection<T>(key: string, fallback: T[]): T[] {
  try {
    assertClientStorage();

    const scopedKey = getScopedStorageKey(key);
    const rawValue = window.localStorage.getItem(scopedKey);

    if (!rawValue) {
      writeCollection(key, fallback);
      return cloneCollection(fallback);
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      writeCollection(key, fallback);
      return cloneCollection(fallback);
    }

    return parsedValue as T[];
  } catch (error) {
    throw createStorageError(error);
  }
}

function writeCollection<T>(key: string, items: T[]) {
  try {
    assertClientStorage();
    window.localStorage.setItem(getScopedStorageKey(key), JSON.stringify(items));
  } catch (error) {
    throw createStorageError(error);
  }
}

function readValue<T>(key: string, fallback: T): T {
  try {
    assertClientStorage();

    const scopedKey = getScopedStorageKey(key);
    const rawValue = window.localStorage.getItem(scopedKey);

    if (!rawValue) {
      writeValue(key, fallback);
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch (error) {
    throw createStorageError(error);
  }
}

function writeValue<T>(key: string, value: T) {
  try {
    assertClientStorage();
    window.localStorage.setItem(getScopedStorageKey(key), JSON.stringify(value));
  } catch (error) {
    throw createStorageError(error);
  }
}

function createEntity<T extends StoredEntity>(
  key: string,
  fallback: T[],
  input: CreateInput<T>,
  idPrefix: string
): T {
  const now = new Date().toISOString();
  const entity = {
    ...input,
    id: input.id ?? createId(idPrefix),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  } as T;
  const items = readCollection<T>(key, fallback);

  writeCollection(key, [entity, ...items]);

  return entity;
}

function updateEntity<T extends StoredEntity>(
  key: string,
  fallback: T[],
  id: string,
  input: UpdateInput<T>
): T {
  const items = readCollection<T>(key, fallback);
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error(`No local record found for id: ${id}`);
  }

  const updatedEntity = {
    ...items[index],
    ...input,
    id,
    createdAt: items[index].createdAt,
    updatedAt: new Date().toISOString(),
  };

  const nextItems = [...items];
  nextItems[index] = updatedEntity;
  writeCollection(key, nextItems);

  return updatedEntity;
}

function deleteEntity<T extends StoredEntity>(key: string, fallback: T[], id: string) {
  const items = readCollection<T>(key, fallback);
  const nextItems = items.filter((item) => item.id !== id);

  if (nextItems.length === items.length) {
    throw new Error(`No local record found for id: ${id}`);
  }

  writeCollection(key, nextItems);
}

export function getTopics() {
  return readCollection<Topic>(STORAGE_KEYS.topics, seedData.topics);
}

export function createTopic(input: CreateInput<Topic>) {
  return createEntity<Topic>(STORAGE_KEYS.topics, seedData.topics, input, "topic");
}

export function updateTopic(id: string, input: UpdateInput<Topic>) {
  return updateEntity<Topic>(STORAGE_KEYS.topics, seedData.topics, id, input);
}

export function deleteTopic(id: string) {
  deleteEntity<Topic>(STORAGE_KEYS.topics, seedData.topics, id);
}

export function getTags() {
  return readCollection<Tag>(STORAGE_KEYS.tags, seedData.tags);
}

export function createTag(input: CreateInput<Tag>) {
  return createEntity<Tag>(STORAGE_KEYS.tags, seedData.tags, input, "tag");
}

export function updateTag(id: string, input: UpdateInput<Tag>) {
  return updateEntity<Tag>(STORAGE_KEYS.tags, seedData.tags, id, input);
}

export function deleteTag(id: string) {
  deleteEntity<Tag>(STORAGE_KEYS.tags, seedData.tags, id);
}

export function getScoreTemplates() {
  return readCollection<ScoreTemplate>(
    STORAGE_KEYS.scoreTemplates,
    seedData.scoreTemplates
  );
}

export function createScoreTemplate(input: CreateInput<ScoreTemplate>) {
  return createEntity<ScoreTemplate>(
    STORAGE_KEYS.scoreTemplates,
    seedData.scoreTemplates,
    input,
    "score-template"
  );
}

export function updateScoreTemplate(id: string, input: UpdateInput<ScoreTemplate>) {
  return updateEntity<ScoreTemplate>(
    STORAGE_KEYS.scoreTemplates,
    seedData.scoreTemplates,
    id,
    input
  );
}

export function getScoreRecords() {
  return readCollection<ScoreRecord>(STORAGE_KEYS.scoreRecords, seedData.scoreRecords);
}

export function createScoreRecord(input: CreateInput<ScoreRecord>) {
  return createEntity<ScoreRecord>(
    STORAGE_KEYS.scoreRecords,
    seedData.scoreRecords,
    input,
    "score-record"
  );
}

export function updateScoreRecord(id: string, input: UpdateInput<ScoreRecord>) {
  return updateEntity<ScoreRecord>(
    STORAGE_KEYS.scoreRecords,
    seedData.scoreRecords,
    id,
    input
  );
}

export function getReviews() {
  return readCollection<Review>(STORAGE_KEYS.reviews, seedData.reviews);
}

export function createReview(input: CreateInput<Review>) {
  return createEntity<Review>(STORAGE_KEYS.reviews, seedData.reviews, input, "review");
}

export function updateReview(id: string, input: UpdateInput<Review>) {
  return updateEntity<Review>(STORAGE_KEYS.reviews, seedData.reviews, id, input);
}

export function getToolboxIcons() {
  return readCollection<ToolboxIcon>(STORAGE_KEYS.toolboxIcons, []);
}

export function createToolboxIcon(input: CreateInput<ToolboxIcon>) {
  return createEntity<ToolboxIcon>(
    STORAGE_KEYS.toolboxIcons,
    [],
    input,
    "toolbox-icon"
  );
}

export function updateToolboxIcon(id: string, input: UpdateInput<ToolboxIcon>) {
  return updateEntity<ToolboxIcon>(STORAGE_KEYS.toolboxIcons, [], id, input);
}

export function deleteToolboxIcon(id: string) {
  deleteEntity<ToolboxIcon>(STORAGE_KEYS.toolboxIcons, [], id);
}

export function getSearchHistory(scope: SearchScope) {
  return readCollection<SearchHistory>(
    STORAGE_KEYS.searchHistory,
    seedData.searchHistory
  )
    .filter((item) => item.scope === scope)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveSearchHistory(scope: SearchScope, keyword: string) {
  const normalizedKeyword = keyword.trim();

  if (!normalizedKeyword) {
    return getSearchHistory(scope);
  }

  const items = readCollection<SearchHistory>(
    STORAGE_KEYS.searchHistory,
    seedData.searchHistory
  );
  const now = new Date().toISOString();
  const nextItem: SearchHistory = {
    id: createId("search"),
    scope,
    keyword: normalizedKeyword,
    createdAt: now,
    updatedAt: now,
  };
  const dedupedItems = items.filter(
    (item) => !(item.scope === scope && item.keyword === normalizedKeyword)
  );

  writeCollection(STORAGE_KEYS.searchHistory, [nextItem, ...dedupedItems].slice(0, 20));

  return getSearchHistory(scope);
}

export function getUserSettings() {
  return readValue<UserSettings>(STORAGE_KEYS.userSettings, seedData.userSettings);
}

export function updateUserSettings(input: Partial<UserSettings>) {
  const currentSettings = getUserSettings();
  const nextSettings = {
    ...currentSettings,
    ...input,
  };

  writeValue(STORAGE_KEYS.userSettings, nextSettings);

  return nextSettings;
}
