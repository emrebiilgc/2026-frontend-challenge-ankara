import type { PersonSummary } from "../types";

export function filterPeople(people: PersonSummary[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return people;
  }

  return people.filter((person) => {
    const fields = [
      person.name,
      person.lastSeen,
      ...person.records.map((record) => record.location),
      ...person.records.map((record) => record.timestamp),
      ...person.records.map((record) => record.content),
      ...person.records.flatMap((record) => record.people),
      ...person.records.flatMap((record) => Object.values(record.metadata)),
    ];

    const haystack = fields
      .filter((value): value is string => typeof value === "string")
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}