"use client";
import { useState, useEffect, useRef } from "react";

const DB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";
const CORRECT_HASH = "133f3d597c724b06170216e7562f77e42196a334b57f711213297aa77bac2121";

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

type Lead = {
  name: string;
  email: string;
  firstSeen: string;
  lastSeen: string;
  joinCount: number;
};

export default function LeadsPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function checkPassword() {
    const hash = await sha256(pw);
    if (hash === CORRECT_HASH) {
      setAuthed(true);
      setPwError("");
    } else {
      setPwError("Wrong password.");
    }
  }

  async function fetchLeads() {
    try {
      const res = await fetch(`${DB}/live/leads.json`);
      const data = await res.json();
      if (!data) { setLeads([]); return; }
      const list: Lead[] = Object.values(data) as Lead[];
      list.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
      setLeads(list);
    } catch {}
  }

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetchLeads().finally(() => setLoading(false));
    timerRef.current = setInterval(fetchLeads, 10000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [authed]);

  function exportCSV() {
    const header = "Name,Email,First Seen,Last Seen,Join Count\n";
    const rows = leads.map(l =>
      `"${l.name}","${l.email}","${l.firstSeen}","${l.lastSeen}",${l.joinCount}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "greenprint-leads.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = leads.filter(l =>
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  type CSSProps = React.CSSProperties;
  const s: Record<string, CSSProps> = {
    page: { minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "monospace", padding: "40px 24px" },
    card: { maxWidth: 960, margin: "0 auto", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32 },
    h1: { fontSize: 28, fontWeight: 700, color: "#22c55e", marginBottom: 8 },
    sub: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 32 },
    input: { width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box" },
    btn: { padding: "12px 28px", background: "#22c55e", color: "#000", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 12 },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
    th: { textAlign: "left", padding: "10px 12px", color: "rgba(255,255,255,0.5)", borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 600 },
    td: { padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.85)" },
    topRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 },
    searchInput: { padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", minWidth: 220 },
    csvBtn: { padding: "10px 20px", background: "rgba(34,197,94,0.15)", border: "1px solid #22c55e", color: "#22c55e", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 },
  };

  if (!authed) {
    return (
      <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 30% 60%,#071a10 0%,#020807 55%)",color:"#fff",fontFamily:"system-ui,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}}>
        <style>{`
          @keyframes orbPulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.65;transform:scale(1.08)}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
          #leads-submit:hover{transform:translateY(-1px) scale(1.02)!important;box-shadow:0 8px 36px rgba(34,197,94,.6)!important}
        `}</style>
        <div style={{position:"absolute",top:"10%",right:"10%",width:380,height:380,background:"radial-gradient(circle,rgba(34,197,94,.09) 0%,transparent 65%)",animation:"orbPulse 4s ease-in-out infinite",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"5%",left:"5%",width:300,height:300,background:"radial-gradient(circle,rgba(34,197,94,.07) 0%,transparent 65%)",animation:"orbPulse 5s ease-in-out infinite 1.5s",pointerEvents:"none"}}/>

        <div style={{width:"100%",maxWidth:400,position:"relative",zIndex:1,animation:"fadeUp .5s ease"}}>
          <div style={{textAlign:"center",marginBottom:40}}>
            <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:66,height:66,borderRadius:18,background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.25)",marginBottom:18,boxShadow:"0 0 36px rgba(34,197,94,.12)"}}>
              <span style={{fontSize:30}}>📋</span>
            </div>
            <div style={{fontSize:11,letterSpacing:"4px",color:"rgba(34,197,94,.55)",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>Host Only</div>
            <div style={{fontSize:28,fontWeight:900,letterSpacing:"-1px",background:"linear-gradient(135deg,#22c55e,#4ade80,#bbf7d0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Leads Dashboard</div>
          </div>

          <div style={{background:"rgba(255,255,255,.025)",border:"1px solid rgba(34,197,94,.12)",borderRadius:22,padding:"32px 28px",backdropFilter:"blur(28px)",boxShadow:"0 0 60px rgba(34,197,94,.05)"}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.3)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:10}}>Password</label>
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(async()=>{const h=await sha256(pw);if(h===CORRECT_HASH){setAuthed(true);}else{setPwError(true);setPw('');}})()}
              placeholder="Enter password"
              style={{width:"100%",padding:"15px 18px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,color:"#fff",fontSize:15,outline:"none",boxSizing:"border-box" as const,marginBottom:16,transition:"border-color .2s"}}
              onFocus={e=>(e.currentTarget.style.borderColor="rgba(34,197,94,.5)")}
              onBlur={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,.1)")}
            />
            <button id="leads-submit" onClick={async()=>{const h=await sha256(pw);if(h===CORRECT_HASH){setAuthed(true);}else{setPwError(true);setPw('');}}}
              style={{width:"100%",padding:"15px 0",background:"linear-gradient(135deg,#15803d,#22c55e,#4ade80)",border:"none",borderRadius:12,color:"#000",fontWeight:900,fontSize:15,cursor:"pointer",letterSpacing:"1px",boxShadow:"0 4px 24px rgba(34,197,94,.35)",transition:"all .2s ease"}}>
              VIEW LEADS
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.topRow}>
          <div>
            <h1 style={s.h1}>Leads Dashboard</h1>
            <p style={s.sub}>
              {leads.length} total · auto-refreshes every 10s{loading ? " · loading..." : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or email..."
              style={s.searchInput}
            />
            <button onClick={exportCSV} style={s.csvBtn}>Export CSV</button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 40 }}>
            {loading ? "Loading..." : "No leads yet."}
          </p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>First Seen</th>
                <th style={s.th}>Last Seen</th>
                <th style={s.th}>Joins</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={i}>
                  <td style={s.td}>{l.name || "—"}</td>
                  <td style={s.td}>{l.email || "—"}</td>
                  <td style={s.td}>{l.firstSeen ? new Date(l.firstSeen).toLocaleString() : "—"}</td>
                  <td style={s.td}>{l.lastSeen ? new Date(l.lastSeen).toLocaleString() : "—"}</td>
                  <td style={s.td}>{l.joinCount ?? 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
