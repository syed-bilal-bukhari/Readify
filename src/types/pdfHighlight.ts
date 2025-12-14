export type Highlight = {
  id: string;
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
  pdfId?: string;
  createdAt?: number;
};
