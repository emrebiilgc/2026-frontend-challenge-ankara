import type { NormalizedRecord, PersonSummary } from "../types";

function parseTimestamp(value: string): number {
  const match = value.match(
    /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/
  );

  if (!match) {
    return 0;
  }

  const [, day, month, year, hour, minute] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  ).getTime();
}

export function sortRecordsByTimestamp(records: NormalizedRecord[]) {
  return [...records].sort(
    (a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp)
  );
}

export function buildPeople(records: NormalizedRecord[]): PersonSummary[] {
  const map = new Map<string, NormalizedRecord[]>();

  for (const record of records) {
    for (const person of record.people) {
      const cleanName = person.trim();

      if (!cleanName) {
        continue;
      }

      const existing = map.get(cleanName) ?? [];
      existing.push(record);
      map.set(cleanName, existing);
    }
  }

  return Array.from(map.entries())
    .map(([name, personRecords]) => {
      const sortedRecords = sortRecordsByTimestamp(personRecords);

      return {
        name,
        records: sortedRecords,
        recordCount: sortedRecords.length,
        sourceCount: new Set(sortedRecords.map((record) => record.source)).size,
        lastSeen: sortedRecords[0]?.timestamp ?? "",
      };
    })
    .sort((a, b) => {
      if (b.recordCount !== a.recordCount) {
        return b.recordCount - a.recordCount;
      }

      return a.name.localeCompare(b.name);
    });
}