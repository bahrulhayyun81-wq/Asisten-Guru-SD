
export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}
