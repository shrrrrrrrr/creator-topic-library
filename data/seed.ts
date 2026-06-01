import type { Review } from "@/types/review";
import type { SearchHistory } from "@/types/search";
import type { ScoreRecord, ScoreTemplate } from "@/types/scoring";
import type { UserSettings } from "@/types/settings";
import type { Tag } from "@/types/tag";
import type { Topic } from "@/types/topic";

export const mockTags: Tag[] = [
  {
    id: "tag-content-strategy",
    name: "内容策略",
    color: "#0f766e",
    description: "用于标记和内容规划、定位、栏目设计相关的选题。",
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "tag-growth",
    name: "增长",
    color: "#ea580c",
    description: "用于标记增长、转化、传播相关的选题。",
    createdAt: "2026-06-01T09:10:00.000Z",
    updatedAt: "2026-06-01T09:10:00.000Z",
  },
];

export const mockScoreTemplates: ScoreTemplate[] = [
  {
    id: "template-default-1",
    name: "评分模板 1",
    color: "#0f766e",
    description: "用于评估选题受众匹配、内容价值和制作可行性的基础模板。",
    criteria: [
      {
        id: "criterion-audience-fit",
        title: "受众匹配度",
        description: "选题是否符合目标受众的真实需求。",
        weight: 0.4,
      },
      {
        id: "criterion-topic-value",
        title: "内容价值",
        description: "选题是否能提供明确的信息、观点或方法价值。",
        weight: 0.35,
      },
      {
        id: "criterion-production-cost",
        title: "制作可行性",
        description: "当前素材、时间和能力是否支持完成该选题。",
        weight: 0.25,
      },
    ],
    bonusItems: [
      {
        id: "bonus-seasonal",
        description: "近期热点或节点相关",
        points: 5,
      },
      {
        id: "bonus-series",
        description: "适合延展为系列内容",
        points: 8,
      },
    ],
    createdAt: "2026-06-01T09:20:00.000Z",
    updatedAt: "2026-06-01T09:20:00.000Z",
  },
];

export const mockTopics: Topic[] = [
  {
    id: "topic-local-storage-workflow",
    title: "如何用本地工具搭建稳定的选题库",
    headings: [
      {
        id: "heading-problem",
        level: 2,
        text: "创作者为什么需要选题库",
      },
      {
        id: "heading-method",
        level: 2,
        text: "一个可持续维护的选题流程",
      },
    ],
    description: "面向个人创作者，介绍如何从零建立可复盘的选题管理习惯。",
    tagIds: ["tag-content-strategy"],
    status: "planned",
    referenceLinks: [
      {
        id: "reference-note-1",
        label: "历史笔记",
        url: "https://example.com/notes/topic-system",
        note: "手动记录的参考资料入口。",
      },
    ],
    materialLinks: [
      {
        id: "material-outline-1",
        label: "大纲素材",
        url: "https://example.com/materials/outline",
        type: "document",
      },
    ],
    latestScoreRecordId: "score-record-topic-1",
    createdAt: "2026-06-01T09:30:00.000Z",
    updatedAt: "2026-06-01T09:40:00.000Z",
  },
  {
    id: "topic-finished-review",
    title: "一次低成本内容复盘的方法",
    headings: [],
    description: "记录发布后如何手动整理数据、观察表现并形成下一次选题判断。",
    tagIds: ["tag-growth"],
    status: "completed",
    referenceLinks: [],
    materialLinks: [],
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:30:00.000Z",
  },
  {
    id: "topic-short-video-hook",
    title: "短视频开头三秒怎么设计",
    headings: [],
    description: "整理适合知识类账号使用的开头结构和表达方式。",
    tagIds: ["tag-content-strategy", "tag-growth"],
    status: "planned",
    referenceLinks: [],
    materialLinks: [],
    latestScoreRecordId: "score-record-topic-2",
    createdAt: "2026-06-01T10:40:00.000Z",
    updatedAt: "2026-06-01T10:50:00.000Z",
  },
  {
    id: "topic-content-calendar",
    title: "一周内容排期复用清单",
    headings: [],
    description: "把重复出现的栏目、主题和素材整理为一周排期模板。",
    tagIds: ["tag-content-strategy"],
    status: "draft",
    referenceLinks: [],
    materialLinks: [],
    latestScoreRecordId: "score-record-topic-3",
    createdAt: "2026-06-01T11:00:00.000Z",
    updatedAt: "2026-06-01T11:10:00.000Z",
  },
];

export const mockScoreRecords: ScoreRecord[] = [
  {
    id: "score-record-topic-1",
    topicId: "topic-local-storage-workflow",
    templateId: "template-default-1",
    criterionScores: [
      {
        criterionId: "criterion-audience-fit",
        score: 86,
      },
      {
        criterionId: "criterion-topic-value",
        score: 82,
      },
      {
        criterionId: "criterion-production-cost",
        score: 78,
      },
    ],
    bonusItemIds: ["bonus-series"],
    customBonusItems: [],
    totalScore: 89.9,
    level: "A",
    createdAt: "2026-06-01T09:45:00.000Z",
    updatedAt: "2026-06-01T09:45:00.000Z",
  },
  {
    id: "score-record-topic-2",
    topicId: "topic-short-video-hook",
    templateId: "template-default-1",
    criterionScores: [
      {
        criterionId: "criterion-audience-fit",
        score: 75,
      },
      {
        criterionId: "criterion-topic-value",
        score: 72,
      },
      {
        criterionId: "criterion-production-cost",
        score: 80,
      },
    ],
    bonusItemIds: [],
    customBonusItems: [],
    totalScore: 75.05,
    level: "A",
    createdAt: "2026-06-01T10:55:00.000Z",
    updatedAt: "2026-06-01T10:55:00.000Z",
  },
  {
    id: "score-record-topic-3",
    topicId: "topic-content-calendar",
    templateId: "template-default-1",
    criterionScores: [
      {
        criterionId: "criterion-audience-fit",
        score: 48,
      },
      {
        criterionId: "criterion-topic-value",
        score: 52,
      },
      {
        criterionId: "criterion-production-cost",
        score: 58,
      },
    ],
    bonusItemIds: [],
    customBonusItems: [],
    totalScore: 52.1,
    level: "C",
    createdAt: "2026-06-01T11:15:00.000Z",
    updatedAt: "2026-06-01T11:15:00.000Z",
  },
];

export const mockSearchHistory: SearchHistory[] = [
  {
    id: "search-topic-1",
    scope: "topics",
    keyword: "复盘",
    createdAt: "2026-06-01T12:30:00.000Z",
    updatedAt: "2026-06-01T12:30:00.000Z",
  },
  {
    id: "search-topic-2",
    scope: "topics",
    keyword: "选题库",
    createdAt: "2026-06-01T12:40:00.000Z",
    updatedAt: "2026-06-01T12:40:00.000Z",
  },
];

export const mockReviews: Review[] = [
  {
    id: "review-topic-finished-1",
    topicId: "topic-finished-review",
    title: "一次低成本内容复盘的方法：发布后记录",
    body: "记录发布后的核心观察和数据变化。",
    headings: [
      {
        id: "review-heading-1",
        level: 2,
        text: "数据表现",
      },
    ],
    contentBlocks: [
      {
        id: "review-block-summary",
        type: "heading",
        level: 2,
        text: "复盘摘要",
      },
      {
        id: "review-block-body",
        type: "paragraph",
        text: "本次内容适合后续扩展成选题评分案例。",
      },
    ],
    imageLinks: [],
    normalLinks: [],
    dataDashboardLinks: [
      {
        id: "dashboard-manual-1",
        label: "手动数据记录表",
        url: "https://example.com/dashboard/manual-data",
      },
    ],
    platform: "视频号",
    publishedAt: "2026-06-01T08:00",
    readOrPlayCount: 1280,
    likeCount: 96,
    commentCount: 18,
    favoriteCount: 42,
    shareCount: 11,
    followerGrowth: 7,
    conversionResult: "引导到资料领取页，获得少量咨询。",
    summary: "标题表达清楚，但开头节奏还可以更快。",
    nextImprovement: "下次开头前 5 秒直接给结论，并补充更具体的案例。",
    createdAt: "2026-06-01T11:00:00.000Z",
    updatedAt: "2026-06-01T11:20:00.000Z",
  },
  {
    id: "review-standalone-1",
    topicId: null,
    title: "独立学习记录：评分维度整理",
    body: "整理评分维度时的学习笔记。",
    headings: [],
    contentBlocks: [
      {
        id: "standalone-block-1",
        type: "paragraph",
        text: "独立复盘文档不依附具体选题，可用于沉淀方法论。",
      },
    ],
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
    summary: "独立文档适合沉淀方法论。",
    nextImprovement: "",
    createdAt: "2026-06-01T12:00:00.000Z",
    updatedAt: "2026-06-01T12:00:00.000Z",
  },
];

export const mockUserSettings: UserSettings = {
  nickname: "创作者",
  avatarUrl: "",
  themeColor: "cyan",
};

export const seedData = {
  topics: mockTopics,
  tags: mockTags,
  scoreTemplates: mockScoreTemplates,
  scoreRecords: mockScoreRecords,
  reviews: mockReviews,
  searchHistory: mockSearchHistory,
  userSettings: mockUserSettings,
};
