export interface UpdateSketchDto {
  title?: string;
  code?: string;
  description?: string;
  codeHistory?: Array<{
    id: string;
    messageId: string;
    timestamp: number;
    previousCode: string;
    newCode: string;
    summary?: string;
  }>;
}
