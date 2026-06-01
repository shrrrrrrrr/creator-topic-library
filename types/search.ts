export type SearchScope = "topics" | "reviews";

export type SearchHistory = {
  id: string;
  scope: SearchScope;
  keyword: string;
  createdAt: string;
  updatedAt: string;
};
