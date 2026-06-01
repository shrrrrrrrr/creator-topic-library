import type { ReferenceLink } from "@/types/common";
import type { TopicHeading } from "@/types/topic";

export type ReviewBlock = {
  id: string;
  type: "paragraph" | "heading" | "imageLink" | "link";
  level?: 1 | 2 | 3;
  text?: string;
  url?: string;
};

export type Review = {
  id: string;
  topicId: string | null;
  title: string;
  body: string;
  headings: TopicHeading[];
  contentBlocks: ReviewBlock[];
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
  createdAt: string;
  updatedAt: string;
};

export type ReviewDoc = Review;
