import type { JotformSubmission, NormalizedRecord } from "../types";

function getFieldValue(submission: JotformSubmission, fieldName: string): string {
  const answers = Object.values(submission.answers ?? {});
  const match = answers.find((answer) => answer.name === fieldName);
  const value = match?.prettyFormat ?? match?.answer;
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeCheckins(
  submissions: JotformSubmission[]
): NormalizedRecord[] {
  return submissions.map((submission) => {
    const personName = getFieldValue(submission, "personName");

    return {
      id: submission.id,
      source: "checkin",
      timestamp: getFieldValue(submission, "timestamp"),
      location: getFieldValue(submission, "location"),
      coordinates: getFieldValue(submission, "coordinates"),
      people: [personName].filter(Boolean),
      primaryPerson: personName,
      content: getFieldValue(submission, "note"),
      metadata: {
        kind: "checkin",
      },
      raw: submission,
    };
  });
}