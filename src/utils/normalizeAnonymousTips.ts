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

export function normalizeAnonymousTips(
  submissions: JotformSubmission[]
): NormalizedRecord[] {
  return submissions.map((submission) => {
    const suspectName = getFieldValue(submission, "suspectName");

    return {
      id: submission.id,
      source: "anonymousTip",
      timestamp: getFieldValue(submission, "timestamp"),
      location: getFieldValue(submission, "location"),
      coordinates: getFieldValue(submission, "coordinates"),
      people: splitNames(suspectName),
      primaryPerson: suspectName,
      content: getFieldValue(submission, "tip"),
      metadata: {
        suspectName,
        confidence: getFieldValue(submission, "confidence"),
        submissionDate: getFieldValue(submission, "submissionDate"),
      },
      raw: submission,
    };
  });
}