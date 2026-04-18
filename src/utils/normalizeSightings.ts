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

export function normalizeSightings(
  submissions: JotformSubmission[]
): NormalizedRecord[] {
  return submissions.map((submission) => {
    const personName = getFieldValue(submission, "personName");
    const seenWith = getFieldValue(submission, "seenWith");

    return {
      id: submission.id,
      source: "sighting",
      timestamp: getFieldValue(submission, "timestamp"),
      location: getFieldValue(submission, "location"),
      coordinates: getFieldValue(submission, "coordinates"),
      people: [personName, ...splitNames(seenWith)].filter(Boolean),
      primaryPerson: personName,
      content: getFieldValue(submission, "note"),
      metadata: {
        seenWith,
      },
      raw: submission,
    };
  });
}