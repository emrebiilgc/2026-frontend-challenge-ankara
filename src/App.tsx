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
function getTrailCompanions(record: NormalizedRecord) {
  return record.people.filter((person) => person !== "Podo");
}

function App() {
  const [data, setData] = useState<FormSubmissionsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPersonName, setSelectedPersonName] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | NormalizedRecord["source"]>("all");
  const [locationFilter, setLocationFilter] = useState("all");
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

    return selectedPerson.records.filter((record) => {
      const matchesSource =
        sourceFilter === "all" ? true : record.source === sourceFilter;

      const matchesLocation =
        locationFilter === "all" ? true : record.location === locationFilter;

      return matchesSource && matchesLocation;
    });
  }, [selectedPerson, sourceFilter, locationFilter]);

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
      topSource: topSourceEntry ? sourceLabel(topSourceEntry[0] as NormalizedRecord["source"]) : "-",
    };
  }, [selectedPerson]);
  useEffect(() => {
    setLocationFilter("all");
  }, [selectedPersonName]);

  const podoRecordsAll = useMemo(() => {
    return allRecords.filter((record) => record.people.includes("Podo"));
  }, [allRecords]);

  const lastPodoRecord = podoRecordsAll[0];

  const podoTrailRecords = useMemo(() => {
    return podoRecordsAll.slice(0, 6);
  }, [podoRecordsAll]);

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
      <div className="topbar-copy">
        <p className="eyebrow">Investigation Dashboard</p>
        <h1>Missing Podo: The Ankara Case</h1>
        <p className="subtle">
          Track Podo’s movement, inspect linked people, and review suspicious clues.
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
      <aside className="panel workspace-sidebar">
        <div className="panel-header compact-header">
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
              onClick={() => {
                setSelectedPersonName(person.name);
                setSourceFilter("all");
                setLocationFilter("all");
              }}
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

      <section className="workspace-main">
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

              {selectedPersonInsight && (
                <div className="person-insight-grid">
                  <div className="person-insight-card">
                    <span>Podo-linked records</span>
                    <strong>{selectedPersonInsight.podoLinkedCount}</strong>
                  </div>

                  <div className="person-insight-card">
                    <span>Last linked location</span>
                    <strong>{selectedPersonInsight.lastLinkedLocation}</strong>
                  </div>

                  <div className="person-insight-card">
                    <span>Last linked timestamp</span>
                    <strong>{selectedPersonInsight.lastLinkedTimestamp}</strong>
                  </div>

                  <div className="person-insight-card">
                    <span>Top source</span>
                    <strong>{selectedPersonInsight.topSource}</strong>
                  </div>
                </div>
              )}

              <div className="filter-bar">
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

                <div className="location-filter-row">
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

      <aside className="workspace-rail">
        <section className="panel compact-case-panel">
          <div className="panel-header compact-header">
            <div>
              <h2>Podo Trail</h2>
              <p className="subtle">Latest case snapshot</p>
            </div>
          </div>

          <div className="case-details compact-case-details">
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
              <strong>
                {lastPodoRecord ? sourceLabel(lastPodoRecord.source) : "-"}
              </strong>
            </div>
          </div>
        </section>

        <section className="panel compact-suspicious-panel">
          <div className="panel-header compact-header">
            <div>
              <h2>Suspicious People</h2>
              <p className="subtle">Clue-based ranking</p>
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
                    <span>Podo-linked: {person.podoLinkedCount}</span>
                    <span>Sightings: {person.sightingCount}</span>
                    <span>Tips: {person.tipCount}</span>
                  </div>
                </div>

                <span className="suspicious-score">{person.score}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel trail-panel">
          <div className="panel-header compact-header">
            <div>
              <h2>Podo Timeline</h2>
              <p className="subtle">Recent linked events</p>
            </div>
          </div>

          <div className="trail-list">
            {podoTrailRecords.map((record) => {
              const companions = getTrailCompanions(record);

              return (
                <article
                  key={`podo-trail-${record.source}-${record.id}`}
                  className="trail-item"
                >
                  <div className="trail-item-left">
                    <span className={`badge badge-${record.source}`}>
                      {sourceLabel(record.source)}
                    </span>
                  </div>

                  <div className="trail-item-body">
                    <div className="trail-item-top">
                      <strong>{record.location || "Unknown location"}</strong>
                      <span className="trail-timestamp">
                        {record.timestamp || "-"}
                      </span>
                    </div>

                    <p className="trail-content">
                      {record.content || "No content."}
                    </p>

                    <div className="trail-meta">
                      {companions.length > 0 && (
                        <span>
                          <strong>Linked with:</strong>{" "}
                          {renderPersonButtons(companions)}
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

                      {record.metadata.confidence && (
                        <span>
                          <strong>Confidence:</strong> {record.metadata.confidence}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </aside>
    </div>
  </div>
);
}

export default App;