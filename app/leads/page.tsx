"use client";
import { useState, useEffect, useRef } from "react";

// ── CRM / call board ────────────────────────────────────────────────────────
// Works the leads captured by /start (quiz) and /stream (viewers).
// Tap to call, tap to text, set status, leave notes. Everything saves live.

const DB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const CORRECT_HASH = "133f3d597c724b06170216e7562f77e42196a334b57f711213297aa77bac2121";

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

type Lead = {
  _key: string;
  name?: string; email?: string; phone?: string;
  firstSeen?: string; lastSeen?: string; joinCount?: number;
  src?: string; path?: string; experience?: string; why?: string; budget?: string; wantsIdeas?: string;
  status?: string; note?: string;
};

const STATUSES = ["New", "Called", "No answer", "Signed up", "Not now"] as const;
const STATUS_COLOR: Record<string, string> = {
  "New": "#00ff87", "Called": "#6bcbff", "No answer": "#ffc832", "Signed up": "#00ff87", "Not now": "rgba(255,255,255,.35)",
};
const EXP: Record<string, string> = { never: "Never traded", tried: "Tried, didn't stick", active: "Trades now" };
const WHY: Record<string, string> = { income: "Extra income", freedom: "Financial freedom", skill: "Learn a skill", fulltime: "Full-time goal" };
const IDEAS: Record<string, string> = { yes: "Wants the trades", learn: "Wants to learn", looking: "Just looking" };

export default function LeadsPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"hot" | "all" | "todo">("hot");
  const [open, setOpen] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function checkPassword() {
    if (await sha256(pw) === CORRECT_HASH) { setAuthed(true); setPwError(""); localStorage.setItem("gp_leads", "1"); }
    else setPwError("Wrong password.");
  }
  useEffect(() => { try { if (localStorage.getItem("gp_leads") === "1") setAuthed(true); } catch {} }, []);

  async function fetchLeads() {
    try {
      const res = await fetch(`${DB}/live/leads.json`, { cache: "no-store" });
      const data = await res.json();
      if (!data) { setLeads([]); return; }
      const list: Lead[] = Object.entries(data).map(([k, v]: [string, any]) => ({ ...(v || {}), _key: k }));
      list.sort((a, b) => {
        const hot = (l: Lead) => (l.path || "").startsWith("🔥") ? 0 : 1;
        if (hot(a) !== hot(b)) return hot(a) - hot(b);
        return new Date(b.lastSeen || b.firstSeen || 0).getTime() - new Date(a.lastSeen || a.firstSeen || 0).getTime();
      });
      setLeads(list);
    } catch {}
  }

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetchLeads().finally(() => setLoading(false));
    timerRef.current = setInterval(fetchLeads, 15000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [authed]);

  const save = async (key: string, patch: Partial<Lead>) => {
    setLeads(ls => ls.map(l => l._key === key ? { ...l, ...patch } : l));
    try { await fetch(`${DB}/live/leads/${key}.json`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); } catch {}
  };

  function exportCSV() {
    const header = "Name,Email,Phone,Priority,Status,Experience,Why,Budget,Note,First Seen\n";
    const rows = leads.map(l => [l.name, l.email, l.phone, l.path, l.status || "New", EXP[l.experience || ""] || "", WHY[l.why || ""] || "", l.budget, (l.note || "").replace(/,/g, ";"), l.firstSeen]
      .map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `greenprint-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const isHot = (l: Lead) => (l.path || "").startsWith("🔥");
  const shown = leads.filter(l => {
    if (filter === "hot" && !isHot(l)) return false;
    if (filter === "todo" && (l.status && l.status !== "New")) return false;
    const q = search.toLowerCase();
    return !q || [l.name, l.email, l.phone, l.path].some(v => (v || "").toLowerCase().includes(q));
  });
  const hotCount = leads.filter(isHot).length;
  const todoCount = leads.filter(l => !l.status || l.status === "New").length;

  if (!authed) return (
    <div style={{ minHeight: "100dvh", background: "#050705", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 14 }}>🔒</div>
        <h1 style={{ fontSize: 21, fontWeight: 900, margin: "0 0 18px" }}>Call Board</h1>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && checkPassword()} placeholder="Password"
          style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box", textAlign: "center" }} />
        {pwError && <p style={{ color: "#ff5566", fontSize: 13, marginTop: 10 }}>{pwError}</p>}
        <button onClick={checkPassword} style={{ width: "100%", marginTop: 12, padding: "14px 0", background: "#00ff87", border: "none", borderRadius: 12, color: "#000", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>Open</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: "#050705", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 40 }}>
      <style>{`
        .lead-card{transition:border-color .2s,background .2s}
        .lead-card:hover{border-color:rgba(0,255,135,.3)}
        .pill{padding:6px 11px;border-radius:9px;font-size:11.5px;font-weight:800;cursor:pointer;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:rgba(255,255,255,.55);transition:all .15s}
        .pill:hover{background:rgba(255,255,255,.1)}
        input,textarea{font-family:inherit}
      `}</style>

      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(5,7,5,.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,.07)", padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 900, margin: 0 }}>📞 Call Board</h1>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,.4)", margin: "2px 0 0" }}>{leads.length} leads · {hotCount} ready to call · {todoCount} not contacted</p>
          </div>
          <button onClick={exportCSV} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 9, color: "#fff", fontSize: 11.5, fontWeight: 700, padding: "8px 12px", cursor: "pointer" }}>Export CSV</button>
        </div>
        <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
          {([["hot", `🔥 Ready (${hotCount})`], ["todo", `To call (${todoCount})`], ["all", `All (${leads.length})`]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 12,
                background: filter === id ? "#00ff87" : "rgba(255,255,255,.05)", color: filter === id ? "#000" : "rgba(255,255,255,.5)",
                border: filter === id ? "none" : "1px solid rgba(255,255,255,.1)" }}>{label}</button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone…"
          style={{ width: "100%", padding: "10px 13px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "#fff", fontSize: 13.5, outline: "none", boxSizing: "border-box" }} />
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, maxWidth: 620, margin: "0 auto" }}>
        {loading && <p style={{ color: "rgba(255,255,255,.35)", fontSize: 13, textAlign: "center" }}>Loading…</p>}
        {!loading && shown.length === 0 && <p style={{ color: "rgba(255,255,255,.3)", fontSize: 13.5, textAlign: "center", padding: "40px 0" }}>Nothing here yet.</p>}

        {shown.map(l => {
          const hot = isHot(l);
          const st = l.status || "New";
          const isOpen = open === l._key;
          return (
            <div key={l._key} className="lead-card" style={{ borderRadius: 15, background: hot ? "rgba(0,255,135,.05)" : "rgba(255,255,255,.035)", border: hot ? "1px solid rgba(0,255,135,.3)" : "1px solid rgba(255,255,255,.09)", padding: "13px 14px" }}>
              <div onClick={() => setOpen(isOpen ? "" : l._key)} style={{ display: "flex", alignItems: "flex-start", gap: 11, cursor: "pointer" }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: hot ? "linear-gradient(135deg,#00ff87,#00c864)" : "rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, color: hot ? "#000" : "#fff" }}>
                  {(l.name || l.email || "?").slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: 14.5 }}>{l.name || "—"}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 6, background: "rgba(255,255,255,.07)", color: STATUS_COLOR[st] }}>{st}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,.45)", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.phone ? l.phone + " · " : ""}{l.email}
                  </p>
                  {l.path && <p style={{ fontSize: 11, color: hot ? "#00ff87" : "rgba(255,255,255,.35)", margin: "4px 0 0", fontWeight: 700 }}>{l.path}</p>}
                </div>
                <span style={{ color: "rgba(255,255,255,.25)", fontSize: 13 }}>{isOpen ? "▲" : "▼"}</span>
              </div>

              {isOpen && (
                <div style={{ marginTop: 13, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                  {(l.experience || l.why || l.wantsIdeas) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                      {l.experience && <span style={{ fontSize: 11, padding: "5px 9px", borderRadius: 8, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.65)" }}>{EXP[l.experience] || l.experience}</span>}
                      {l.why && <span style={{ fontSize: 11, padding: "5px 9px", borderRadius: 8, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.65)" }}>Wants: {WHY[l.why] || l.why}</span>}
                      {l.wantsIdeas && <span style={{ fontSize: 11, padding: "5px 9px", borderRadius: 8, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.65)" }}>{IDEAS[l.wantsIdeas] || l.wantsIdeas}</span>}
                    </div>
                  )}

                  {l.phone && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <a href={`tel:${l.phone.replace(/\D/g, "")}`} onClick={() => save(l._key, { status: "Called" })}
                        style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 11, background: "linear-gradient(135deg,#00ff87,#00c864)", color: "#000", fontWeight: 900, fontSize: 14, textDecoration: "none" }}>📞 Call</a>
                      <a href={`sms:${l.phone.replace(/\D/g, "")}`}
                        style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 11, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.13)", color: "#fff", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>💬 Text</a>
                    </div>
                  )}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {STATUSES.map(s => (
                      <button key={s} className="pill" onClick={() => save(l._key, { status: s })}
                        style={st === s ? { background: "rgba(0,255,135,.15)", borderColor: "rgba(0,255,135,.4)", color: "#00ff87" } : {}}>{s}</button>
                    ))}
                  </div>

                  <textarea defaultValue={l.note || ""} onBlur={e => save(l._key, { note: e.target.value })} placeholder="Notes from the call…"
                    style={{ width: "100%", minHeight: 60, padding: "10px 12px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical" }} />

                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,.25)", margin: "9px 0 0" }}>
                    {l.src === "start-quiz" ? "From the welcome quiz" : l.src === "viewer-csv" ? "From a stream" : "Imported"} · {(l.firstSeen || "").slice(0, 10)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
