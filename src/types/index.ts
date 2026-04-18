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