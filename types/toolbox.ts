export type ToolboxIcon = {
  id: string;
  name: string;
  url: string;
  coverType: "color" | "image";
  coverColor?: string;
  coverImageUrl?: string;
  x: number;
  y: number;
  gridIndex?: number;
  gridRow?: number;
  gridCol?: number;
  createdAt: string;
  updatedAt: string;
};
