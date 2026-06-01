export type ReferenceLink = {
  id: string;
  label: string;
  url: string;
  note?: string;
};

export type MaterialLink = {
  id: string;
  label: string;
  url: string;
  type: "image" | "video" | "audio" | "document" | "other";
  note?: string;
};
