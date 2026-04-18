import type { PersonSummary } from "../types";

export function filterPeople(people: PersonSummary[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return people;
  }

  return people.filter((person) => {
    const haystack = [
      person.name,
      ...person.records.map((record) => record.location),
      ...person.records.map((record) => record.content),
      ...person.records.flatMap((record) => record.people),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}