export type JotformAnswer = {
  name?: string;
  order?: string;
  text?: string;
  type?: string;
  answer?: unknown;
  prettyFormat?: string;
};

export type JotformSubmission = {
  id: string;
  form_id?: string;
  ip?: string;
  created_at?: string;
  updated_at?: string;
  answers?: Record<string, JotformAnswer>;
  [key: string]: unknown;
};

export type JotformApiResponse<T> = {
  responseCode: number;
  message: string;
  content: T;
  duration?: string;
};

export type FormSubmissionsMap = {
  checkins: JotformSubmission[];
  messages: JotformSubmission[];
  sightings: JotformSubmission[];
  personalNotes: JotformSubmission[];
  anonymousTips: JotformSubmission[];
};

export type SourceType =
  | "checkin"
  | "message"
  | "sighting"
  | "personalNote"
  | "anonymousTip";

export type NormalizedRecord = {
  id: string;
  source: SourceType;
  timestamp: string;
  location: string;
  coordinates: string;
  people: string[];
  primaryPerson?: string;
  content: string;
  metadata: Record<string, string>;
  raw: JotformSubmission;
};

export type PersonSummary = {
  name: string;
  records: NormalizedRecord[];
  recordCount: number;
  sourceCount: number;
  lastSeen: string;
};