export type PdfRecord = {
  id: string;
  title: string;
  path: string;
};

export type HighlightRecord = {
  id: string;
  pdfId: string;
  page: number;
  top: number;
  left: number;
  width: number;
  height: number;
  topicIds: string[];
  book?: string;
  volume?: string;
  chapter?: string;
  tags?: string[];
  description?: string;
  createdAt: number;
};

export type TopicRecord = {
  id: string;
  name: string;
  parentId: string | null;
};

export type PdfIndexBackup = {
  pdfs: PdfRecord[];
  lastPdfId: string | null;
  highlights: HighlightRecord[];
  topics: TopicRecord[];
};
