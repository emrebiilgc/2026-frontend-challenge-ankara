import type { JotformSubmission, NormalizedRecord } from "../types";

function getFieldValue(submission: JotformSubmission, fieldName: string): string {
  const answers = Object.values(submission.answers ?? {});
  const match = answers.find((answer) => answer.name === fieldName);
  const value = match?.prettyFormat ?? match?.answer;
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeMessages(
  submissions: JotformSubmission[]
): NormalizedRecord[] {
  return submissions.map((submission) => {
    const senderName = getFieldValue(submission, "senderName");
    const recipientName = getFieldValue(submission, "recipientName");

    return {
      id: submission.id,
      source: "message",
      timestamp: getFieldValue(submission, "timestamp"),
      location: getFieldValue(submission, "location"),
      coordinates: getFieldValue(submission, "coordinates"),
      people: [senderName, recipientName].filter(Boolean),
      primaryPerson: senderName,
      content: getFieldValue(submission, "text"),
      metadata: {
        senderName,
        recipientName,
        urgency: getFieldValue(submission, "urgency"),
      },
      raw: submission,
    };
  });
}