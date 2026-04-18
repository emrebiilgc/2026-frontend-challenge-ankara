import { FORM_IDS, type FormKey } from "../config/forms";
import type { JotformApiResponse, JotformSubmission } from "../types";

async function jotformFetch<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while requesting ${path}`);
  }

  const data = (await response.json()) as JotformApiResponse<T>;
  return data.content;
}

export async function getFormSubmissions(
  formId: string
): Promise<JotformSubmission[]> {
  return jotformFetch<JotformSubmission[]>(`/form/${formId}/submissions`);
}

export async function getAllFormSubmissions() {
  const entries = Object.entries(FORM_IDS) as [FormKey, string][];

  const results = await Promise.all(
    entries.map(async ([key, formId]) => {
      const submissions = await getFormSubmissions(formId);
      return [key, submissions] as const;
    })
  );

  return Object.fromEntries(results) as Record<FormKey, JotformSubmission[]>;
}