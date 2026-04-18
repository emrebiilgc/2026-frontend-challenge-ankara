import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { getAllFormSubmissions } from "./api/jotform";
import type { FormSubmissionsMap, NormalizedRecord } from "./types";
import { normalizeCheckins } from "./utils/normalizeCheckins";
import { normalizeMessages } from "./utils/normalizeMessages";
import { normalizeSightings } from "./utils/normalizeSightings";
import { normalizePersonalNotes } from "./utils/normalizePersonalNotes";
import { normalizeAnonymousTips } from "./utils/normalizeAnonymousTips";
import { buildPeople, sortRecordsByTimestamp } from "./utils/people";
import { filterPeople } from "./utils/search";

function scorePerson(name: string, records: NormalizedRecord[]) {
  let score = 0;

  for (const record of records) {
    const includesPodo = record.people.includes("Podo");

    if (includesPodo && name !== "Podo") {
      score += 3;
    }

    if (record.source === "sighting") {
      score += 2;
    }

    if (record.source === "anonymousTip") {
      score += 2;
    }
  }

  score += Math.max(0, new Set(records.map((record) => record.source)).size - 1);

  return score;
}

function getLastSeenWith(record?: NormalizedRecord) {
  if (!record) {
    return "-";
  }

  const others = record.people.filter((person) => person !== "Podo");
  return others.length ? others.join(", ") : "-";
}

function sourceLabel(source: NormalizedRecord["source"]) {
  switch (source) {
    case "checkin":
      return "Checkin";
    case "message":
      return "Message";
    case "sighting":
      return "Sighting";
    case "personalNote":
      return "Personal Note";
    case "anonymousTip":
      return "Anonymous Tip";
    default:
      return source;
  }
}

function App() {
  const [data, setData] = useState<FormSubmissionsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPersonName, setSelectedPersonName] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | NormalizedRecord["source"]>("all");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const result = await getAllFormSubmissions();
        setData(result as FormSubmissionsMap);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const allRecords = useMemo(() => {
    if (!data) {
      return [];
    }

    return sortRecordsByTimestamp([
      ...normalizeCheckins(data.checkins),
      ...normalizeMessages(data.messages),
      ...normalizeSightings(data.sightings),
      ...normalizePersonalNotes(data.personalNotes),
      ...normalizeAnonymousTips(data.anonymousTips),
    ]);
  }, [data]);

  const people = useMemo(() => buildPeople(allRecords), [allRecords]);

  const filteredPeople = useMemo(
    () => filterPeople(people, search),
    [people, search]
  );

  useEffect(() => {
    if (!filteredPeople.length) {
      setSelectedPersonName("");
      return;
    }

    const stillExists = filteredPeople.some(
      (person) => person.name === selectedPersonName
    );

    if (!selectedPersonName || !stillExists) {
      setSelectedPersonName(filteredPeople[0].name);
    }
  }, [filteredPeople, selectedPersonName]);

  const selectedPerson = filteredPeople.find(
    (person) => person.name === selectedPersonName
  );

    const selectedPersonRecords = useMemo(() => {
    if (!selectedPerson) {
      return [];
    }

    if (sourceFilter === "all") {
      return selectedPerson.records;
    }

    return selectedPerson.records.filter((record) => record.source === sourceFilter);
  }, [selectedPerson, sourceFilter]);

  const podoRecordsAll = useMemo(() => {
    return allRecords.filter((record) => record.people.includes("Podo"));
  }, [allRecords]);

  const lastPodoRecord = podoRecordsAll[0];

  const suspiciousPeople = useMemo(() => {
    return people
      .filter((person) => person.name !== "Podo")
      .map((person) => ({
        name: person.name,
        score: scorePerson(person.name, person.records),
        lastSeen: person.lastSeen,
        recordCount: person.recordCount,
      }))
      .sort((a, b) => b.score - a.score || b.recordCount - a.recordCount)
      .slice(0, 5);
  }, [people]);

  const totalPeople = people.length;
  const totalRecords = allRecords.length;
  const podoRecords = allRecords.filter((record) =>
    record.people.includes("Podo")
  ).length;

  if (loading) {
    return <div className="page-state">Loading Jotform data...</div>;
  }

  if (error) {
    return (
      <div className="page-state">
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="page-state">No data found.</div>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Investigation Dashboard</p>
          <h1>Missing Podo: The Ankara Case</h1>
        </div>

        <input
          className="search-input"
          type="text"
          placeholder="Search people, places, notes..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </header>

      <section className="summary-grid">
  <article className="summary-card">
    <span>Total Records</span>
    <strong>{totalRecords}</strong>
  </article>

  <article className="summary-card">
    <span>People Involved</span>
    <strong>{totalPeople}</strong>
  </article>

  <article className="summary-card">
    <span>Podo-Linked Records</span>
    <strong>{podoRecords}</strong>
  </article>

  <article className="summary-card">
    <span>Sources Covered</span>
    <strong>5</strong>
  </article>
</section>

<section className="case-grid">
  <article className="panel">
    <div className="panel-header">
      <div>
        <h2>Podo Trail</h2>
        <p className="subtle">Latest known clue based on all linked records</p>
      </div>
    </div>

    <div className="case-details">
      <div>
        <span className="case-label">Last known location</span>
        <strong>{lastPodoRecord?.location || "-"}</strong>
      </div>

      <div>
        <span className="case-label">Last known timestamp</span>
        <strong>{lastPodoRecord?.timestamp || "-"}</strong>
      </div>

      <div>
        <span className="case-label">Last seen with</span>
        <strong>{getLastSeenWith(lastPodoRecord)}</strong>
      </div>

      <div>
        <span className="case-label">Latest source</span>
        <strong>{lastPodoRecord ? sourceLabel(lastPodoRecord.source) : "-"}</strong>
      </div>
    </div>
  </article>

  <article className="panel">
    <div className="panel-header">
      <div>
        <h2>Suspicious People</h2>
        <p className="subtle">Simple clue-based ranking from linked records</p>
      </div>
    </div>

    <div className="suspicious-list">
      {suspiciousPeople.map((person) => (
        <button
          key={person.name}
          className="suspicious-item"
          onClick={() => setSelectedPersonName(person.name)}
        >
          <div>
            <strong>{person.name}</strong>
            <p>{person.recordCount} linked records</p>
          </div>

          <span className="suspicious-score">{person.score}</span>
        </button>
      ))}
    </div>
  </article>
</section>

      <main className="layout">
        <aside className="panel people-panel">
          <div className="panel-header">
            <h2>People</h2>
            <span>{filteredPeople.length} results</span>
          </div>

          <div className="people-list">
            {filteredPeople.map((person) => (
              <button
                key={person.name}
                className={
                  person.name === selectedPersonName
                    ? "person-card active"
                    : "person-card"
                }
                onClick={() => setSelectedPersonName(person.name)}
              >
                <div className="person-card-top">
                  <strong>{person.name}</strong>
                  <span>{person.recordCount} records</span>
                </div>

                <div className="person-card-meta">
                  <span>{person.sourceCount} sources</span>
                  <span>Last seen: {person.lastSeen || "-"}</span>
                </div>
              </button>
            ))}

            {!filteredPeople.length && (
              <div className="empty-state">No matching people found.</div>
            )}
          </div>
        </aside>

        <section className="panel detail-panel">
  {!selectedPerson ? (
    <div className="empty-state">Select a person to inspect details.</div>
  ) : (
    <>
      <div className="panel-header">
        <div>
          <h2>{selectedPerson.name}</h2>
          <p className="subtle">
            {selectedPerson.recordCount} linked records across{" "}
            {selectedPerson.sourceCount} sources
          </p>
        </div>
      </div>

      <div className="filter-row">
        <button
          className={sourceFilter === "all" ? "filter-chip active" : "filter-chip"}
          onClick={() => setSourceFilter("all")}
        >
          All
        </button>

        <button
          className={sourceFilter === "checkin" ? "filter-chip active" : "filter-chip"}
          onClick={() => setSourceFilter("checkin")}
        >
          Checkins
        </button>

        <button
          className={sourceFilter === "message" ? "filter-chip active" : "filter-chip"}
          onClick={() => setSourceFilter("message")}
        >
          Messages
        </button>

        <button
          className={sourceFilter === "sighting" ? "filter-chip active" : "filter-chip"}
          onClick={() => setSourceFilter("sighting")}
        >
          Sightings
        </button>

        <button
          className={sourceFilter === "personalNote" ? "filter-chip active" : "filter-chip"}
          onClick={() => setSourceFilter("personalNote")}
        >
          Notes
        </button>

        <button
          className={sourceFilter === "anonymousTip" ? "filter-chip active" : "filter-chip"}
          onClick={() => setSourceFilter("anonymousTip")}
        >
          Tips
        </button>
      </div>

      <div className="records-list">
        {selectedPersonRecords.map((record) => {
          const otherPeople = record.people.filter(
            (person) => person !== selectedPerson.name
          );

          return (
            <article key={`${record.source}-${record.id}`} className="record-card">
              <div className="record-card-top">
                <span className={`badge badge-${record.source}`}>
                  {sourceLabel(record.source)}
                </span>
                <span className="record-timestamp">{record.timestamp || "-"}</span>
              </div>

              <h3>{record.location || "Unknown location"}</h3>

              <p className="record-content">{record.content || "No content."}</p>

              <div className="record-meta">
                <span>
                  <strong>People:</strong>{" "}
                  {record.people.length ? record.people.join(", ") : "-"}
                </span>

                {otherPeople.length > 0 && (
                  <span>
                    <strong>Linked with:</strong> {otherPeople.join(", ")}
                  </span>
                )}

                {record.metadata.urgency && (
                  <span>
                    <strong>Urgency:</strong> {record.metadata.urgency}
                  </span>
                )}

                {record.metadata.confidence && (
                  <span>
                    <strong>Confidence:</strong> {record.metadata.confidence}
                  </span>
                )}

                {record.metadata.recipientName && (
                  <span>
                    <strong>Recipient:</strong> {record.metadata.recipientName}
                  </span>
                )}

                {record.metadata.seenWith && (
                  <span>
                    <strong>Seen with:</strong> {record.metadata.seenWith}
                  </span>
                )}

                {record.coordinates && (
                  <span>
                    <strong>Coordinates:</strong> {record.coordinates}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  )}
</section>
      </main>
    </div>
  );
}

export default App;