export const FORM_IDS = {
  checkins: "261065067494966",
  messages: "261065765723966",
  sightings: "261065244786967",
  personalNotes: "261065509008958",
  anonymousTips: "261065875889981",
} as const;

export type FormKey = keyof typeof FORM_IDS;