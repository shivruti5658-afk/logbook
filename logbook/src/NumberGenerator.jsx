import React, { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { supabase } from "./supabaseClient";

const SESSION_STORAGE_KEY = "aerolog-number-generator-session";
const LOCAL_SESSIONS_STORAGE_KEY = "aerolog-number-generator-local-sessions";
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

function sanitizeFileName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "number-generator";
}

function readLocalSessions() {
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function writeLocalSessions(sessions) {
  window.localStorage.setItem(LOCAL_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
}

export default function NumberGenerator({ navigateTo }) {
  const [minValue, setMinValue] = useState("1");
  const [maxValue, setMaxValue] = useState("100");
  const [session, setSession] = useState(null);
  const [sessionName, setSessionName] = useState("My Session");
  const [generatedNumbers, setGeneratedNumbers] = useState([]);
  const [remainingPool, setRemainingPool] = useState([]);
  const [currentNumber, setCurrentNumber] = useState(null);
  const [notice, setNotice] = useState("Create a session to begin.");
  const [searchValue, setSearchValue] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [savedSessions, setSavedSessions] = useState([]);

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

  const loadSavedSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("generator_sessions")
        .select("id, session_name, min_value, max_value, total_numbers, generated_count, remaining, status, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const remoteSessions = (data || []).map((item) => ({
        ...item,
        session_name: item.session_name || "Untitled Session",
      }));
      setSavedSessions(remoteSessions.length ? remoteSessions : readLocalSessions());
    } catch (error) {
      console.error(error);
      setSavedSessions(readLocalSessions());
    }
  };

  useEffect(() => {
    void loadSavedSessions();

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
      sessionName: session.session_name || sessionName,
      minValue: session.min_value,
      maxValue: session.max_value,
      currentNumber,
      generatedNumbers,
      remainingPool,
      totalNumbers,
    };
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  }, [session, currentNumber, generatedNumbers, remainingPool, sessionName, totalNumbers]);

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
        throw new Error("Missing remote session");
      }

      const { data: generatedData, error: generatedError } = await supabase
        .from("generated_numbers")
        .select("generated_number, generated_at, is_checked")
        .eq("session_id", sessionId)
        .order("generated_at", { ascending: true });

      if (generatedError) throw generatedError;

      const generatedList = (generatedData || []).map((entry) => ({
        generated_number: Number(entry.generated_number),
        generated_at: entry.generated_at,
        is_checked: entry.is_checked ?? false,
      }));
      const usedNumbers = new Set(generatedList.map((entry) => entry.generated_number));
      const fullRange = buildFullRange(
        Number(sessionData.min_value),
        Number(sessionData.max_value),
      );
      const remaining = fullRange.filter((number) => !usedNumbers.has(number));
      setSession(sessionData);
      setSessionName(sessionData.session_name || "Untitled Session");
      setGeneratedNumbers(generatedList);
      setRemainingPool(shuffle(remaining));
      setCurrentNumber(generatedList.at(-1)?.generated_number ?? null);
      setNotice(`Resumed session with ${generatedList.length} numbers generated.`);
    } catch (error) {
      const localSessions = readLocalSessions();
      const localSession = localSessions.find((item) => item.id === sessionId);
      if (localSession) {
        setSession(localSession);
        setSessionName(localSession.session_name || "Untitled Session");
        setGeneratedNumbers(localSession.generated_numbers || []);
        setRemainingPool(localSession.remaining_pool || []);
        setCurrentNumber(localSession.current_number ?? null);
        setNotice(`Resumed local session with ${localSession.generated_numbers?.length || 0} numbers generated.`);
        return;
      }
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
      const name = sessionName.trim() || "Untitled Session";
      const sessionId = crypto.randomUUID();
      const sessionPayload = {
        id: sessionId,
        session_name: name,
        min_value: min,
        max_value: max,
        total_numbers: total,
        generated_count: 0,
        remaining: total,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const localSession = {
        ...sessionPayload,
        session_name: name,
        generated_numbers: [],
        remaining_pool: fullRange,
        current_number: null,
      };
      const localSessions = readLocalSessions();
      writeLocalSessions([localSession, ...localSessions.filter((item) => item.id !== sessionId)]);

      try {
        const { data: createdSession, error: sessionError } = await supabase
          .from("generator_sessions")
          .insert([sessionPayload])
          .select()
          .single();

        if (!sessionError && createdSession) {
          setSession(createdSession);
        } else {
          throw sessionError || new Error("Supabase insert failed");
        }
      } catch (syncError) {
        console.error(syncError);
        setSession(localSession);
        setNotice(`Session "${name}" created locally. ${total} numbers available.`);
      }

      setSessionName(name);
      setGeneratedNumbers([]);
      setRemainingPool(fullRange);
      setCurrentNumber(null);
      await loadSavedSessions();
      if (!notice.includes("created locally")) {
        setNotice(`Session "${name}" ready. ${total} numbers available.`);
      }
    } catch (error) {
      console.error(error);
      setNotice("The session could not be created. Please try again.");
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
        is_checked: false,
      };

      const nextGeneratedNumbers = [...generatedNumbers, newEntry];
      const nextGeneratedCount = nextGeneratedNumbers.length;
      const nextRemaining = updatedPool.length;

      const localSessions = readLocalSessions();
      const nextLocalSessions = localSessions.map((item) =>
        item.id === session.id
          ? {
              ...item,
              generated_numbers: nextGeneratedNumbers,
              remaining_pool: updatedPool,
              current_number: nextNumber,
              generated_count: nextGeneratedCount,
              remaining: nextRemaining,
              status: nextRemaining === 0 ? "completed" : "active",
              updated_at: new Date().toISOString(),
            }
          : item,
      );
      writeLocalSessions(nextLocalSessions);

      try {
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
      } catch (syncError) {
        console.error(syncError);
        setNotice(`Generated ${nextNumber}. Saved locally for now.`);
      }

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

    const confirmed = window.confirm("Archive the current session and clear the active view?");
    if (!confirmed) return;

    setResetting(true);
    try {
      try {
        await supabase
          .from("generator_sessions")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.id);
      } catch (syncError) {
        console.error(syncError);
      }

      const localSessions = readLocalSessions();
      writeLocalSessions(
        localSessions.map((item) =>
          item.id === session.id ? { ...item, status: "completed", updated_at: new Date().toISOString() } : item,
        ),
      );

      setSession(null);
      setSessionName("My Session");
      setGeneratedNumbers([]);
      setRemainingPool([]);
      setCurrentNumber(null);
      setSearchValue("");
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      await loadSavedSessions();
      setNotice("Session archived. Create a new one to continue.");
    } catch (error) {
      console.error(error);
      setNotice("The session could not be reset. Please try again.");
    } finally {
      setResetting(false);
    }
  }

  async function handleLoadSavedSession(sessionId) {
    await restoreSession(sessionId);
  }

  async function handleToggleChecked(entry) {
    const nextValue = !entry.is_checked;
    try {
      const { error } = await supabase
        .from("generated_numbers")
        .update({ is_checked: nextValue })
        .eq("session_id", session.id)
        .eq("generated_number", entry.generated_number);

      if (error) throw error;
    } catch (error) {
      console.error(error);
    }

    const updatedGeneratedNumbers = generatedNumbers.map((item) =>
      item.generated_number === entry.generated_number && item.generated_at === entry.generated_at
        ? { ...item, is_checked: nextValue }
        : item,
    );
    setGeneratedNumbers(updatedGeneratedNumbers);

    const localSessions = readLocalSessions();
    writeLocalSessions(
      localSessions.map((item) =>
        item.id === session.id ? { ...item, generated_numbers: updatedGeneratedNumbers } : item,
      ),
    );
  }

  function handleExport(type) {
    const rows = generatedNumbers.map((entry) => ({
      number: entry.generated_number,
      generated_at: entry.generated_at,
      is_checked: entry.is_checked,
    }));
    const exportName = session?.session_name || sessionName || "Number Generator Results";
    const exportFileName = sanitizeFileName(exportName);

    if (type === "csv") {
      const csv = ["number,generated_at,is_checked", ...rows.map((row) => `${row.number},${row.generated_at},${row.is_checked ? "true" : "false"}`)].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${exportFileName}.csv`;
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
      link.download = `${exportFileName}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("JSON exported.");
      return;
    }

    if (type === "pdf") {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(exportName, 14, 20);
      doc.setFontSize(11);
      doc.text(`Range: ${session?.min_value ?? minValue} to ${session?.max_value ?? maxValue}`, 14, 32);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.text("Generated Numbers", 14, 54);
      doc.setFont("helvetica", "bold");
      rows.forEach((row, index) => {
        const y = 68 + index * 10;
        doc.setFontSize(16);
        doc.text(`${index + 1}. ${row.number}`, 14, y);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`${row.is_checked ? "✓ Checked" : "○ Pending"} • ${row.generated_at}`, 40, y + 2);
      });
      doc.save(`${exportFileName}.pdf`);
      setNotice("PDF exported.");
      return;
    }

    setNotice("Export ready in the dashboard workflow.");
  }

  const lastEntry = generatedNumbers.length ? generatedNumbers[generatedNumbers.length - 1] : null;

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
              <label className="field-label">Session Name</label>
              <input
                className="input"
                placeholder="My Session"
                value={sessionName}
                onChange={(event) => setSessionName(event.target.value)}
              />
            </div>
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
            <div className="generator-display-label">Current Session</div>
            <div className="generator-session-name">{session?.session_name || sessionName}</div>
            <div className="generator-display-label">Current Generated Number</div>
            <div className="generator-display-number">{currentNumber ?? "—"}</div>
            <div className="current-number-check" style={{ marginTop: 10 }}>
              <label className="recent-chip-check">
                <input
                  type="checkbox"
                  checked={Boolean(lastEntry?.is_checked)}
                  disabled={!lastEntry}
                  onChange={() => lastEntry && void handleToggleChecked(lastEntry)}
                />
                <span style={{ marginLeft: 8 }}>{lastEntry ? "Checked" : ""}</span>
              </label>
            </div>
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

          <div className="generator-panel">
            <div className="panel-title">Saved Sessions</div>
            {savedSessions.length === 0 ? (
              <div className="empty-state">No saved sessions yet.</div>
            ) : (
              <div className="saved-session-list">
                {savedSessions.map((item) => (
                  <button
                    key={item.id}
                    className="saved-session-item"
                    onClick={() => void handleLoadSavedSession(item.id)}
                  >
                    <strong>{item.session_name || "Untitled Session"}</strong>
                    <span>{item.min_value} → {item.max_value}</span>
                    <small>
                      {item.generated_count} generated • {item.status}
                    </small>
                  </button>
                ))}
              </div>
            )}
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
                      <label className="recent-chip-check">
                        <input
                          type="checkbox"
                          checked={Boolean(entry.is_checked)}
                          onChange={() => void handleToggleChecked(entry)}
                        />
                        <span>{entry.generated_number}</span>
                      </label>
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
