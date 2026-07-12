import React, { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { supabase } from "./supabaseClient";

const SESSION_STORAGE_KEY = "aerolog-number-generator-session";
const RECENT_LIMIT = 20;

function buildFullRange(minValue, maxValue) {
  return Array.from({ length: maxValue - minValue + 1 }, (_, index) => minValue + index);
}

function shuffle(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function formatTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

export default function NumberGenerator({ navigateTo }) {
  const [minValue, setMinValue] = useState("1");
  const [maxValue, setMaxValue] = useState("100");
  const [session, setSession] = useState(null);
  const [generatedNumbers, setGeneratedNumbers] = useState([]);
  const [remainingPool, setRemainingPool] = useState([]);
  const [currentNumber, setCurrentNumber] = useState(null);
  const [notice, setNotice] = useState("Create a session to begin.");
  const [searchValue, setSearchValue] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resetting, setResetting] = useState(false);

  const totalNumbers = useMemo(() => {
    const min = Number(minValue);
    const max = Number(maxValue);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min >= max) return 0;
    return max - min + 1;
  }, [minValue, maxValue]);

  const remainingCount = remainingPool.length;
  const generatedCount = generatedNumbers.length;
  const progressPercent = totalNumbers
    ? Math.min(100, (generatedCount / totalNumbers) * 100)
    : 0;

  const recentNumbers = useMemo(
    () => [...generatedNumbers].slice(-RECENT_LIMIT).reverse(),
    [generatedNumbers],
  );

  useEffect(() => {
    const cached = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!cached) return;

    try {
      const parsed = JSON.parse(cached);
      if (parsed?.sessionId) {
        void restoreSession(parsed.sessionId);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (!session?.id) return;

    const payload = {
      sessionId: session.id,
      minValue: session.min_value,
      maxValue: session.max_value,
      currentNumber,
    };
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  }, [session, currentNumber]);

  useEffect(() => {
    if (!searchValue.trim()) {
      setSearchResult(null);
      return;
    }

    const value = searchValue.trim();
    const match = generatedNumbers.find(
      (entry) => String(entry.generated_number) === value,
    );

    if (match) {
      setSearchResult(match);
      return;
    }

    setSearchResult({ notFound: true, value });
  }, [searchValue, generatedNumbers]);

  async function restoreSession(sessionId) {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from("generator_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();

      if (sessionError) throw sessionError;
      if (!sessionData) {
        setNotice("The stored session could not be found.");
        return;
      }

      const { data: generatedData, error: generatedError } = await supabase
        .from("generated_numbers")
        .select("generated_number, generated_at")
        .eq("session_id", sessionId)
        .order("generated_at", { ascending: true });

      if (generatedError) throw generatedError;

      const generatedList = (generatedData || []).map((entry) => ({
        generated_number: Number(entry.generated_number),
        generated_at: entry.generated_at,
      }));
      const usedNumbers = new Set(generatedList.map((entry) => entry.generated_number));
      const fullRange = buildFullRange(
        Number(sessionData.min_value),
        Number(sessionData.max_value),
      );
      const remaining = fullRange.filter((number) => !usedNumbers.has(number));
      setSession(sessionData);
      setGeneratedNumbers(generatedList);
      setRemainingPool(shuffle(remaining));
      setCurrentNumber(generatedList.at(-1)?.generated_number ?? null);
      setNotice(`Resumed session with ${generatedList.length} numbers generated.`);
    } catch (error) {
      console.error(error);
      setNotice("Unable to restore the session right now.");
    }
  }

  async function handleCreateSession(event) {
    event.preventDefault();
    const min = Number(minValue);
    const max = Number(maxValue);

    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      setNotice("Please enter whole numbers for both fields.");
      return;
    }

    if (min >= max) {
      setNotice("Minimum should be smaller than maximum.");
      return;
    }

    setCreatingSession(true);
    try {
      const total = max - min + 1;
      const fullRange = shuffle(buildFullRange(min, max));
      const sessionPayload = {
        id: crypto.randomUUID(),
        min_value: min,
        max_value: max,
        total_numbers: total,
        generated_count: 0,
        remaining: total,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdSession, error: sessionError } = await supabase
        .from("generator_sessions")
        .insert([sessionPayload])
        .select()
        .single();

      if (sessionError) throw sessionError;

      setSession(createdSession);
      setGeneratedNumbers([]);
      setRemainingPool(fullRange);
      setCurrentNumber(null);
      setNotice(`Session ready. ${total} numbers available.`);
    } catch (error) {
      console.error(error);
      setNotice("The session could not be created. Please check Supabase.");
    } finally {
      setCreatingSession(false);
    }
  }

  async function handleGenerateNumber() {
    if (!session?.id) {
      setNotice("Create a session before generating a number.");
      return;
    }

    if (remainingPool.length === 0) {
      setNotice("All numbers have been generated.");
      return;
    }

    setGenerating(true);
    try {
      const nextNumber = remainingPool[remainingPool.length - 1];
      const updatedPool = remainingPool.slice(0, -1);
      const newEntry = {
        generated_number: nextNumber,
        generated_at: new Date().toISOString(),
      };

      const nextGeneratedNumbers = [...generatedNumbers, newEntry];
      const nextGeneratedCount = nextGeneratedNumbers.length;
      const nextRemaining = updatedPool.length;

      const { error: insertError } = await supabase
        .from("generated_numbers")
        .insert([
          {
            session_id: session.id,
            generated_number: nextNumber,
            generated_at: newEntry.generated_at,
          },
        ]);

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("generator_sessions")
        .update({
          generated_count: nextGeneratedCount,
          remaining: nextRemaining,
          status: nextRemaining === 0 ? "completed" : "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      if (updateError) throw updateError;

      setGeneratedNumbers(nextGeneratedNumbers);
      setRemainingPool(updatedPool);
      setCurrentNumber(nextNumber);
      setNotice(`Generated ${nextNumber}.`);
    } catch (error) {
      console.error(error);
      setNotice("Unable to save the generated number. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleResetSession() {
    if (!session?.id) {
      setNotice("There is no active session to reset.");
      return;
    }

    const confirmed = window.confirm("Reset this session? This will clear the current generator state.");
    if (!confirmed) return;

    setResetting(true);
    try {
      await supabase.from("generated_numbers").delete().eq("session_id", session.id);
      await supabase.from("generator_sessions").delete().eq("id", session.id);
      setSession(null);
      setGeneratedNumbers([]);
      setRemainingPool([]);
      setCurrentNumber(null);
      setSearchValue("");
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      setNotice("Session reset. Create a new one to continue.");
    } catch (error) {
      console.error(error);
      setNotice("The session could not be reset. Please try again.");
    } finally {
      setResetting(false);
    }
  }

  function handleExport(type) {
    const rows = generatedNumbers.map((entry) => ({
      number: entry.generated_number,
      generated_at: entry.generated_at,
    }));

    if (type === "csv") {
      const csv = ["number,generated_at", ...rows.map((row) => `${row.number},${row.generated_at}`)].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "number-generator-results.csv";
      link.click();
      URL.revokeObjectURL(url);
      setNotice("CSV exported.");
      return;
    }

    if (type === "json") {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "number-generator-results.json";
      link.click();
      URL.revokeObjectURL(url);
      setNotice("JSON exported.");
      return;
    }

    if (type === "pdf") {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Number Generator Results", 14, 16);
      doc.setFontSize(11);
      rows.forEach((row, index) => {
        doc.text(`${index + 1}. ${row.number} — ${row.generated_at}`, 14, 28 + index * 8);
      });
      doc.save("number-generator-results.pdf");
      setNotice("PDF exported.");
      return;
    }

    setNotice("Export ready in the dashboard workflow.");
  }

  return (
    <div className="generator-page">
      <div className="generator-shell">
        <section className="generator-card">
          <div className="generator-hero">
            <div>
              <div className="section-tag">UNIQUE RANDOM NUMBER GENERATOR</div>
              <h2>Generate numbers without repetition in a premium, session-safe flow.</h2>
              <p>
                Create a session, generate unique values, and preserve every result in Supabase for a smooth, reusable experience.
              </p>
            </div>
            <div className="generator-badge">Fast • Secure • Replayable</div>
          </div>

          <div className="generator-nav">
            <button className="secondary-btn" onClick={() => navigateTo?.("/")}>
              Back to Logbook
            </button>
          </div>

          <form className="generator-controls" onSubmit={handleCreateSession}>
            <div className="field-group">
              <label className="field-label">Minimum Number</label>
              <input
                className="input"
                type="number"
                value={minValue}
                onChange={(event) => setMinValue(event.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Maximum Number</label>
              <input
                className="input"
                type="number"
                value={maxValue}
                onChange={(event) => setMaxValue(event.target.value)}
              />
            </div>
            <button className="primary-btn" type="submit" disabled={creatingSession}>
              {creatingSession ? "Creating..." : "Create Session"}
            </button>
          </form>

          <div className="generator-display-card">
            <div className="generator-display-label">Current Generated Number</div>
            <div className="generator-display-number">{currentNumber ?? "—"}</div>
            <div className="generator-actions">
              <button className="primary-btn" onClick={handleGenerateNumber} disabled={generating || !session}>
                {generating ? "Generating..." : "Generate Number"}
              </button>
              <button className="secondary-btn" onClick={handleResetSession} disabled={resetting}>
                {resetting ? "Resetting..." : "Reset Session"}
              </button>
            </div>
          </div>

          <div className="generator-progress-card">
            <div className="progress-meta">
              <span>Generated {generatedCount} / {totalNumbers || 0}</span>
              <span>{remainingCount} remaining</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="generator-status">{notice}</div>
          </div>

          <div className="generator-grid">
            <div className="generator-panel">
              <div className="panel-title">Recent Numbers</div>
              {recentNumbers.length === 0 ? (
                <div className="empty-state">No numbers generated yet.</div>
              ) : (
                <div className="recent-list">
                  {recentNumbers.map((entry) => (
                    <div key={`${entry.generated_number}-${entry.generated_at}`} className="recent-chip">
                      <span>{entry.generated_number}</span>
                      <small>{formatTimestamp(entry.generated_at)}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="generator-panel">
              <div className="panel-title">Search Generated Number</div>
              <input
                className="input"
                placeholder="Enter a number"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
              {searchResult ? (
                searchResult.notFound ? (
                  <div className="search-state">No result found for {searchResult.value}.</div>
                ) : (
                  <div className="search-state">
                    <strong>Found {searchResult.generated_number}</strong>
                    <div>Generated at {formatTimestamp(searchResult.generated_at)}</div>
                  </div>
                )
              ) : (
                <div className="search-state">Search for a generated value to see its timestamp.</div>
              )}
              <div className="export-row">
                <button className="secondary-btn" onClick={() => handleExport("csv")}>Export CSV</button>
                <button className="secondary-btn" onClick={() => handleExport("json")}>Export JSON</button>
                <button className="secondary-btn" onClick={() => handleExport("pdf")}>Export PDF</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
