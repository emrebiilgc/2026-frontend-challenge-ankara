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
      return "Check-in";
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

function sourceIcon(source: NormalizedRecord["source"]) {
  switch (source) {
    case "checkin":
      return "✓";
    case "message":
      return "✉";
    case "sighting":
      return "●";
    case "personalNote":
      return "✎";
    case "anonymousTip":
      return "!";
    default:
      return "·";
  }
}

function getScoreTier(score: number): "high" | "mid" | "low" {
  if (score >= 12) return "high";
  if (score >= 6) return "mid";
  return "low";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function App() {
  const [data, setData] = useState<FormSubmissionsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPersonName, setSelectedPersonName] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | NormalizedRecord["source"]>("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [showTimeline, setShowTimeline] = useState(false);

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

  const recordMatchesSearch = (record: NormalizedRecord, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const fields = [
    record.location,
    record.timestamp,
    record.content,
    ...record.people,
    ...Object.values(record.metadata),
  ];

  const haystack = fields
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
};

const selectedPersonRecords = useMemo(() => {
  if (!selectedPerson) {
    return [];
  }

  return selectedPerson.records.filter((record) => {
    const matchesSource =
      sourceFilter === "all" ? true : record.source === sourceFilter;

    const matchesLocation =
      locationFilter === "all" ? true : record.location === locationFilter;

    const matchesSearch = recordMatchesSearch(record, search);

    return matchesSource && matchesLocation && matchesSearch;
  });
}, [selectedPerson, sourceFilter, locationFilter, search]);

  const selectedPersonLocations = useMemo(() => {
    if (!selectedPerson) {
      return [];
    }

    return Array.from(
      new Set(
        selectedPerson.records
          .map((record) => record.location)
          .filter((location) => location && location.trim() !== "")
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [selectedPerson]);

  const selectedPersonInsight = useMemo(() => {
    if (!selectedPerson) {
      return null;
    }

    const podoLinkedRecords = selectedPerson.records.filter((record) =>
      record.people.includes("Podo")
    );

    const sortedPodoLinked = sortRecordsByTimestamp(podoLinkedRecords);
    const lastLinkedRecord = sortedPodoLinked[0];

    const sourceCounts = selectedPerson.records.reduce<Record<string, number>>(
      (acc, record) => {
        acc[record.source] = (acc[record.source] ?? 0) + 1;
        return acc;
      },
      {}
    );

    const topSourceEntry = Object.entries(sourceCounts).sort(
      (a, b) => b[1] - a[1]
    )[0];

    return {
      podoLinkedCount: podoLinkedRecords.length,
      lastLinkedLocation: lastLinkedRecord?.location || "-",
      lastLinkedTimestamp: lastLinkedRecord?.timestamp || "-",
      topSource: topSourceEntry
        ? sourceLabel(topSourceEntry[0] as NormalizedRecord["source"])
        : "-",
    };
  }, [selectedPerson]);

  useEffect(() => {
    setLocationFilter("all");
  }, [selectedPersonName]);

  const podoRecordsAll = useMemo(() => {
    return allRecords.filter((record) => record.people.includes("Podo"));
  }, [allRecords]);

  const lastPodoRecord = podoRecordsAll[0];

  const TIMELINE_PREVIEW_COUNT = 1;

const visiblePodoTimelineRecords = showTimeline
  ? podoRecordsAll
  : podoRecordsAll.slice(0, TIMELINE_PREVIEW_COUNT);

const hiddenPodoTimelineCount = Math.max(
  0,
  podoRecordsAll.length - TIMELINE_PREVIEW_COUNT
);

  const suspiciousPeople = useMemo(() => {
    return people
      .filter((person) => person.name !== "Podo")
      .map((person) => {
        const podoLinkedRecords = person.records.filter((record) =>
          record.people.includes("Podo")
        );

        const sightingCount = person.records.filter(
          (record) => record.source === "sighting"
        ).length;

        const tipCount = person.records.filter(
          (record) => record.source === "anonymousTip"
        ).length;

        const lastLinkedRecord = sortRecordsByTimestamp(podoLinkedRecords)[0];

        return {
          name: person.name,
          score: scorePerson(person.name, person.records),
          lastSeen: person.lastSeen,
          recordCount: person.recordCount,
          podoLinkedCount: podoLinkedRecords.length,
          sightingCount,
          tipCount,
          lastLinkedLocation: lastLinkedRecord?.location || "-",
          lastLinkedTimestamp: lastLinkedRecord?.timestamp || "-",
        };
      })
      .sort((a, b) => b.score - a.score || b.recordCount - a.recordCount)
      .slice(0, 5);
  }, [people]);

  const totalPeople = people.length;
  const totalRecords = allRecords.length;
  const podoRecords = allRecords.filter((record) =>
    record.people.includes("Podo")
  ).length;

  const renderPersonButtons = (names: string[]) => {
    return names.map((name, index) => (
      <span key={name}>
        <button
          type="button"
          className="inline-person-button"
          onClick={() => {
            setSelectedPersonName(name);
            setSourceFilter("all");
            setLocationFilter("all");
          }}
        >
          {name}
        </button>
        {index < names.length - 1 ? ", " : ""}
      </span>
    ));
  };

  if (loading) {
    return <div className="page-state">Loading case data…</div>;
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
        <div className="topbar-copy">
          <p className="eyebrow">Investigation Dashboard</p>
          <h1>Missing Podo: The Ankara Case</h1>
          <p className="subtle">
            Track Podo's movement, inspect linked people, and review suspicious clues.
          </p>
        </div>

        <div className="topbar-stats">
          <article className="mini-stat">
            <span>Total Records</span>
            <strong>{totalRecords}</strong>
          </article>

          <article className="mini-stat">
            <span>People</span>
            <strong>{totalPeople}</strong>
          </article>

          <article className="mini-stat">
            <span>Podo-Linked</span>
            <strong>{podoRecords}</strong>
          </article>

          <article className="mini-stat">
            <span>Sources</span>
            <strong>5</strong>
          </article>
        </div>
      </header>

      <div className="workspace">
        {/* ── Sidebar: People ── */}
        <aside className="panel workspace-sidebar">
          <div className="panel-header compact-header">
            <span className="panel-title">People</span>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              {filteredPeople.length}
            </span>
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
                onClick={() => {
                  setSelectedPersonName(person.name);
                  setSourceFilter("all");
                  setLocationFilter("all");
                }}
              >
                <div className="person-avatar">
                  {getInitials(person.name)}
                </div>
                <div className="person-info">
                  <div className="person-card-top">
                    <strong>{person.name}</strong>
                  </div>
                  <div className="person-card-meta">
                    <span>{person.recordCount} records · {person.sourceCount} sources</span>
                    <span>Last: {person.lastSeen || "-"}</span>
                  </div>
                </div>
              </button>
            ))}

            {!filteredPeople.length && (
              <div className="empty-state">No matching people found.</div>
            )}
          </div>
        </aside>

        {/* ── Main: Detail ── */}
        <section className="workspace-main">
          <section className="panel workspace-search-panel">
            <div className="workspace-search-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                className="workspace-search-input"
                type="text"
                placeholder="Search people, places, notes…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="workspace-search-count">
                {filteredPeople.length} matches
              </span>
            </div>
          </section>

          <section className="panel detail-panel">
            {!selectedPerson ? (
              <div className="empty-state">Select a person to inspect details.</div>
            ) : (
              <>
                <div className="panel-header">
                  <div>
                    <h2 style={{ fontSize: "16px", fontWeight: 600 }}>
                      {selectedPerson.name}
                    </h2>
                    <p className="subtle">
                      {selectedPerson.recordCount} linked records across{" "}
                      {selectedPerson.sourceCount} sources
                    </p>
                  </div>
                </div>

                {selectedPersonInsight && (
                  <div className="person-insight-grid">
                    <div className="person-insight-card">
                      <span>Podo-linked</span>
                      <strong>{selectedPersonInsight.podoLinkedCount}</strong>
                    </div>
                    <div className="person-insight-card">
                      <span>Last linked location</span>
                      <strong>{selectedPersonInsight.lastLinkedLocation}</strong>
                    </div>
                    <div className="person-insight-card">
                      <span>Last linked time</span>
                      <strong>{selectedPersonInsight.lastLinkedTimestamp}</strong>
                    </div>
                    <div className="person-insight-card">
                      <span>Top source</span>
                      <strong>{selectedPersonInsight.topSource}</strong>
                    </div>
                  </div>
                )}

                <div className="filter-bar filter-toolbar">
                  <div className="filter-row">
                    {(
                      [
                        { value: "all", label: "All" },
                        { value: "checkin", label: "Check-ins" },
                        { value: "message", label: "Messages" },
                        { value: "sighting", label: "Sightings" },
                        { value: "personalNote", label: "Notes" },
                        { value: "anonymousTip", label: "Tips" },
                      ] as const
                    ).map(({ value, label }) => (
                      <button
                        key={value}
                        className={sourceFilter === value ? "filter-chip active" : "filter-chip"}
                        onClick={() => setSourceFilter(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="location-filter-inline">
                    <label htmlFor="location-filter" className="location-filter-label">
                      Location
                    </label>
                    <select
                      id="location-filter"
                      className="location-select"
                      value={locationFilter}
                      onChange={(event) => setLocationFilter(event.target.value)}
                    >
                      <option value="all">All locations</option>
                      {selectedPersonLocations.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="records-list">
                  {selectedPersonRecords.length === 0 ? (
                    <div className="empty-state">No records match the current filters.</div>
                  ) : (
                    selectedPersonRecords.map((record) => {
                      const otherPeople = record.people.filter(
                        (person) => person !== selectedPerson.name
                      );

                      return (
                        <article
                          key={`${record.source}-${record.id}`}
                          className="record-card"
                          data-source={record.source}
                        >
                          <div className="record-card-top">
                            <span className={`badge badge-${record.source}`}>
                              {sourceLabel(record.source)}
                            </span>
                            <span className="record-timestamp">
                              {record.timestamp || "-"}
                            </span>
                          </div>

                          <h3>{record.location || "Unknown location"}</h3>

                          <p className="record-content">
                            {record.content || "No content."}
                          </p>

                          <div className="record-meta">
                            <span>
                              <strong>People:</strong>{" "}
                              {record.people.length
                                ? renderPersonButtons(record.people)
                                : "-"}
                            </span>

                            {otherPeople.length > 0 && (
                              <span>
                                <strong>Linked with:</strong>{" "}
                                {renderPersonButtons(otherPeople)}
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
                                <strong>Recipient:</strong>{" "}
                                {record.metadata.recipientName}
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
                    })
                  )}
                </div>
              </>
            )}
          </section>
        </section>

        {/* ── Right Rail ── */}
        <aside className="workspace-rail">

          {/* Podo Trail snapshot */}
          <section className="panel compact-case-panel">
            <div className="panel-header compact-header">
              <div>
                <span className="panel-title">Podo Trail</span>
                <p className="subtle" style={{ marginTop: "3px" }}>Latest case snapshot</p>
              </div>
            </div>

            <div className="compact-case-details">
              <div>
                <span className="case-label">Last known location</span>
                <strong>{lastPodoRecord?.location || "-"}</strong>
              </div>
              <div>
                <span className="case-label">Last timestamp</span>
                <strong>{lastPodoRecord?.timestamp || "-"}</strong>
              </div>
              <div>
                <span className="case-label">Last seen with</span>
                <strong>{getLastSeenWith(lastPodoRecord)}</strong>
              </div>
              <div>
                <span className="case-label">Latest source</span>
                <strong>
                  {lastPodoRecord ? sourceLabel(lastPodoRecord.source) : "-"}
                </strong>
              </div>
            </div>
          </section>

          {/* Podo Timeline */}
          <section className="panel trail-panel">
  <div className="panel-header">
    <div className="trail-panel-title-group">
      <span className="panel-title">Podo Timeline</span>
      <p className="subtle" style={{ marginTop: "3px" }}>
        {showTimeline
          ? `${podoRecordsAll.length} events, newest first`
          : `Showing ${Math.min(TIMELINE_PREVIEW_COUNT, podoRecordsAll.length)} of ${podoRecordsAll.length} events`}
      </p>
    </div>
    <button
      className="timeline-toggle-button"
      style={{ flexShrink: 0 }}
      onClick={() => setShowTimeline((v) => !v)}
    >
      {showTimeline ? "Show less ↑" : `Show all ${podoRecordsAll.length} ↓`}
    </button>
  </div>

  <div className={`trail-list ${showTimeline ? "expanded" : "collapsed"}`}>
    {visiblePodoTimelineRecords.map((record, index, arr) => (
      <div
        key={`${record.source}-${record.id}`}
        className="trail-item"
        style={index === arr.length - 1 ? { paddingBottom: 0 } : undefined}
      >
        <div className={`trail-dot trail-dot-${record.source}`}>
          {sourceIcon(record.source)}
        </div>
        <div className="trail-body">
          <div className="trail-item-header">
            <strong className="trail-title">
              {record.location || "Unknown location"}
            </strong>
            <span className="trail-timestamp">
              {record.timestamp || "-"}
            </span>
          </div>
          <p className="trail-content">
            {record.content
              ? record.content.slice(0, 80) +
                (record.content.length > 80 ? "…" : "")
              : "No details."}
          </p>
          {record.people.filter((p) => p !== "Podo").length > 0 && (
            <div className="trail-meta">
              <span>
                With:{" "}
                {record.people
                  .filter((p) => p !== "Podo")
                  .join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>
    ))}

    {!showTimeline && hiddenPodoTimelineCount > 0 && (
      <div className="timeline-more-hint">
        + {hiddenPodoTimelineCount} more events
      </div>
    )}

    {!podoRecordsAll.length && (
      <div className="empty-state">No Podo-linked records found.</div>
    )}
  </div>
</section>

          {/* Suspicious People */}
          <section className="panel compact-suspicious-panel">
            <div className="panel-header compact-header">
              <div>
                <span className="panel-title">Suspicious People</span>
                <p className="subtle" style={{ marginTop: "3px" }}>Clue-based ranking</p>
              </div>
            </div>

            <div className="suspicious-list">
              {suspiciousPeople.map((person) => (
                <button
                  key={person.name}
                  className="suspicious-item"
                  onClick={() => {
                    setSelectedPersonName(person.name);
                    setSourceFilter("all");
                    setLocationFilter("all");
                  }}
                >
                  <div className="suspicious-item-body">
                    <div className="suspicious-item-top">
                      <strong>{person.name}</strong>
                      <p>{person.recordCount} linked records</p>
                    </div>

                    <div className="suspicious-reasons">
                      <span>Podo: {person.podoLinkedCount}</span>
                      <span>Sightings: {person.sightingCount}</span>
                      <span>Tips: {person.tipCount}</span>
                    </div>
                  </div>

                  <span
                    className="suspicious-score"
                    data-tier={getScoreTier(person.score)}
                  >
                    {person.score}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default App;