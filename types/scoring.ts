export type ScoreLevel = "S" | "A" | "B" | "C" | "D";

export type ScoreCriterion = {
  id: string;
  title?: string;
  description: string;
  weight: number;
};

export type BonusItem = {
  id: string;
  description: string;
  points: number;
};

export type ScoreTemplate = {
  id: string;
  name: string;
  color: string;
  description?: string;
  criteria: ScoreCriterion[];
  bonusItems: BonusItem[];
  createdAt: string;
  updatedAt: string;
};

export type CriterionScore = {
  criterionId: string;
  score: number;
};

export type ScoreRecord = {
  id: string;
  topicId: string;
  templateId: string;
  criterionScores: CriterionScore[];
  bonusItemIds: string[];
  customBonusItems?: BonusItem[];
  totalScore: number;
  level: ScoreLevel;
  createdAt: string;
  updatedAt: string;
};

export type TopicScore = ScoreRecord;
