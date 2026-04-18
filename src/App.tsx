import { useEffect, useState } from "react";
import "./App.css";
import { getAllFormSubmissions } from "./api/jotform";
import type { FormSubmissionsMap } from "./types";

function App() {
  const [data, setData] = useState<FormSubmissionsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const result = await getAllFormSubmissions();

        console.log("ALL FORM SUBMISSIONS:", result);
        console.log("CHECKINS SAMPLE:", result.checkins?.[0]);
        console.log("MESSAGES SAMPLE:", result.messages?.[0]);
        console.log("SIGHTINGS SAMPLE:", result.sightings?.[0]);
        console.log("PERSONAL NOTES SAMPLE:", result.personalNotes?.[0]);
        console.log("ANONYMOUS TIPS SAMPLE:", result.anonymousTips?.[0]);

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

  if (loading) {
    return <div style={{ padding: 24 }}>Loading Jotform data...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return <div style={{ padding: 24 }}>No data found.</div>;
  }

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Missing Podo Investigation Dashboard</h1>
      <p>Initial data fetch successful.</p>

      <ul>
        <li>Checkins: {data.checkins.length}</li>
        <li>Messages: {data.messages.length}</li>
        <li>Sightings: {data.sightings.length}</li>
        <li>Personal Notes: {data.personalNotes.length}</li>
        <li>Anonymous Tips: {data.anonymousTips.length}</li>
      </ul>

      <p>Open browser console to inspect raw submission shapes.</p>
    </div>
  );
}

export default App;