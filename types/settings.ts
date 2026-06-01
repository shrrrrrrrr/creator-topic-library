export type ThemeColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "cyan"
  | "blue"
  | "purple"
  | "light"
  | "dark";

export type UserSettings = {
  nickname: string;
  avatarUrl?: string;
  themeColor: ThemeColor;
};
