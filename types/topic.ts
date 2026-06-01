import type { MaterialLink, ReferenceLink } from "@/types/common";

export type TopicStatus =
  | "draft"
  | "planned"
  | "in_progress"
  | "completed"
  | "reviewed";

export type TopicHeading = {
  id: string;
  level: 1 | 2 | 3;
  text: string;
};

export type Topic = {
  id: string;
  title: string;
  headings: TopicHeading[];
  description: string;
  tagIds: string[];
  status: TopicStatus;
  referenceLinks: ReferenceLink[];
  materialLinks: MaterialLink[];
  latestScoreRecordId?: string;
  createdAt: string;
  updatedAt: string;
};
