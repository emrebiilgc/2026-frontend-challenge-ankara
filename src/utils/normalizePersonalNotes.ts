import type { JotformSubmission, NormalizedRecord } from "../types";

function getFieldValue(submission: JotformSubmission, fieldName: string): string {
  const answers = Object.values(submission.answers ?? {});
  const match = answers.find((answer) => answer.name === fieldName);
  const value = match?.prettyFormat ?? match?.answer;
  return typeof value === "string" ? value.trim() : "";
}

function splitNames(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizePersonalNotes(
  submissions: JotformSubmission[]
): NormalizedRecord[] {
  return submissions.map((submission) => {
    const authorName = getFieldValue(submission, "authorName");
    const mentionedPeople = getFieldValue(submission, "mentionedPeople");

    return {
      id: submission.id,
      source: "personalNote",
      timestamp: getFieldValue(submission, "timestamp"),
      location: getFieldValue(submission, "location"),
      coordinates: getFieldValue(submission, "coordinates"),
      people: [authorName, ...splitNames(mentionedPeople)].filter(Boolean),
      primaryPerson: authorName,
      content: getFieldValue(submission, "note"),
      metadata: {
        authorName,
        mentionedPeople,
      },
      raw: submission,
    };
  });
}