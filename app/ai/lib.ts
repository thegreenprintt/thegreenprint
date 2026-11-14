// Shared helpers for The Greenprint AI (/ai)

export type Role = "user" | "assistant";
export interface Msg {
  role: Role;
  content: string;          // what the model sees (for user msgs: text without file bodies)
  files?: { name: string; text: string }[]; // attached documents (text extracted in-browser)
  imgs?: number;            // how many images were attached
}
export interface Convo {
  id: string;
  title: string;
  messages: Msg[];
  ts: number;
  pinned?: boolean;
  renamed?: boolean;
  mode?: ModeId;
}

export type ModeId = "" | "coach" | "content" | "builder" | "strategist";
export const MODES: { id: ModeId; label: string; blurb: string }[] = [
  { id: "", label: "Chat", blurb: "Ask anything" },
  { id: "coach", label: "Trade Coach", blurb: "Setups, risk, psychology" },
  { id: "content", label: "Content Studio", blurb: "Hooks, captions, scripts" },
  { id: "builder", label: "Builder", blurb: "Websites and code" },
  { id: "strategist", label: "Strategist", blurb: "Business decisions" },
];

export const STARTERS: Record<string, { tag: string; text: string }[]> = {
  "": [
    { tag: "Build", text: "Build me a premium landing page for a new trading course. Dark, high end, with a hero and an email signup." },
    { tag: "Trade", text: "Break down a clean day trading setup with entry, stop loss, and target, and how to size the position." },
    { tag: "Content", text: "Give me 5 content hooks for The Greenprint that don't sound like generic guru hype." },
    { tag: "Strategy", text: "Act as my strategic partner. Ask me 3 sharp questions about The Greenprint before giving advice." },
  ],
  coach: [
    { tag: "Risk", text: "Walk me through how much I should risk per trade and why it matters more than win rate." },
    { tag: "Setup", text: "Break down a pullback entry on a trending stock: trigger, stop loss, target and what invalidates it." },
    { tag: "Mindset", text: "I keep moving my stop loss when a trade goes against me. Help me fix that." },
    { tag: "Review", text: "Give me a simple end of day trade review checklist I can use every session." },
  ],
  content: [
    { tag: "Hooks", text: "Write 7 scroll-stopping hooks for a video about why most new traders blow their first account." },
    { tag: "Caption", text: "Write an Instagram caption for a clip of me breaking down a trade live. No hype." },
    { tag: "Script", text: "Write a 30 second video script explaining what a stop loss is, for complete beginners." },
    { tag: "Week", text: "Plan a week of content for The Greenprint: one idea per day with the hook and format." },
  ],
  builder: [
    { tag: "Course", text: "Build a premium landing page for my day trading course with pricing, FAQ and an email signup." },
    { tag: "Event", text: "Build a site for a live trading event: date, city, schedule, speakers and a ticket button." },
    { tag: "Links", text: "Build a link-in-bio page for The Greenprint with my socials, free signals and the app." },
    { tag: "Tool", text: "Build a position size calculator web page that looks premium and works on phones." },
  ],
  strategist: [
    { tag: "Growth", text: "What are the 3 highest leverage moves to grow The Greenprint in the next 90 days?" },
    { tag: "Offer", text: "Help me design a paid offer on top of my free signals without losing trust." },
    { tag: "Deal", text: "Prep me for a partnership call with a broker. What should I ask for and what's my walk-away?" },
    { tag: "Focus", text: "I'm doing too many things at once. Help me decide what to cut this month." },
  ],
};

export interface Command { cmd: string; label: string; fill?: string; action?: "size" | "rr" | "talk" | "new" | "settings"; mode?: ModeId }
export const COMMANDS: Command[] = [
  { cmd: "/hooks", label: "Hooks for a video", fill: "Write 7 scroll-stopping hooks for a video about ", mode: "content" },
  { cmd: "/caption", label: "Instagram caption", fill: "Write an Instagram caption for ", mode: "content" },
  { cmd: "/script", label: "30 second video script", fill: "Write a 30 second video script about ", mode: "content" },
  { cmd: "/recap", label: "Trading recap post", fill: "Write a clean trading recap post for today. Here's what happened: ", mode: "content" },
  { cmd: "/email", label: "Email to my list", fill: "Write an email to my list about ", mode: "content" },
  { cmd: "/plan", label: "Trade plan", fill: "Build me a trade plan for this setup (ticker, timeframe, idea): ", mode: "coach" },
  { cmd: "/explain", label: "Explain like I'm new", fill: "Explain this like I'm brand new to trading: ", mode: "coach" },
  { cmd: "/build", label: "Build a website", fill: "Build a premium landing page for ", mode: "builder" },
  { cmd: "/decide", label: "Help me decide", fill: "Help me decide. Here's the situation: ", mode: "strategist" },
  { cmd: "/size", label: "Position size calculator", action: "size" },
  { cmd: "/rr", label: "Risk / reward calculator", action: "rr" },
  { cmd: "/talk", label: "Talk mode (hands-free)", action: "talk" },
  { cmd: "/settings", label: "Custom instructions", action: "settings" },
  { cmd: "/new", label: "New chat", action: "new" },
];

export function uid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

const SITE_START = "===GREENPRINT_SITE_START===";
const SITE_END = "===GREENPRINT_SITE_END===";
export { SITE_START, SITE_END };

export function extractSite(raw: string): { html: string; chat: string; building: boolean } {
  const i = raw.indexOf(SITE_START);
  if (i === -1) return { html: "", chat: raw, building: false };
  const afterStart = raw.slice(i + SITE_START.length);
  const j = afterStart.indexOf(SITE_END);
  if (j === -1) {
    const intro = raw.slice(0, i).trim();
    const chat = (intro ? intro + "\n\n" : "") + "**Building your website...** it will appear in the panel.";
    return { html: afterStart.trim(), chat, building: true };
  }
  const html = afterStart.slice(0, j).trim();
  const intro = raw.slice(0, i).trim();
  const tail = afterStart.slice(j + SITE_END.length).trim();
  const chat =
    (intro ? intro + "\n\n" : "") +
    "**Your website is ready.** It's in the panel, preview it, check the code, or download it." +
    (tail ? "\n\n" + tail : "");
  return { html, chat, building: false };
}
export function cleanSiteHtml(h: string): string {
  return h.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "").trim();
}

// Follow-up suggestions: the model ends answers with <<<FOLLOWUPS: a | b | c>>>
export function splitFollowups(raw: string): { text: string; followups: string[] } {
  const k = raw.indexOf("<<<");
  if (k === -1) return { text: raw, followups: [] };
  const m = raw.slice(k).match(/<<<\s*FOLLOW\s*UPS?\s*:([\s\S]*?)>>>/i);
  const followups = m ? m[1].split("|").map((s) => s.trim().replace(/^["'\-\d.\s]+/, "")).filter((s) => s.length > 2).slice(0, 3) : [];
  return { text: raw.slice(0, k).trimEnd(), followups };
}

// What the user sees / copies for an assistant message
// The free models sometimes use em/en dashes despite instructions; swap them for commas.
export function undash(s: string): string {
  return s.replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1 to $2").replace(/\s*[\u2014\u2013]\s*/g, ", ").replace(/,\s*,/g, ",");
}
export function displayText(raw: string): string {
  return undash(splitFollowups(extractSite(raw).chat).text);
}

// Markdown → safe HTML (escapes first). Supports headings, bold/italic, links,
// lists, blockquotes, tables, inline code and fenced code with a copy button.
export function renderMd(src: string): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  const blocks: string[] = [];
  let s = src.replace(/```([\w+-]*)[^\n]*\n?([\s\S]*?)(```|$)/g, (_m, lang, code) => {
    blocks.push(
      `<div class="gp-codeblk"><div class="gp-codehd"><span>${esc(lang || "code")}</span><button type="button" data-copy="1">Copy</button></div><pre><code>${esc(String(code).replace(/\n$/, ""))}</code></pre></div>`
    );
    return `\u0000B${blocks.length - 1}\u0000`;
  });
  s = esc(s);
  s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  s = s.replace(/^#### (.*)$/gm, "<h3>$1</h3>").replace(/^### (.*)$/gm, "<h3>$1</h3>").replace(/^## (.*)$/gm, "<h2>$1</h2>").replace(/^# (.*)$/gm, "<h1>$1</h1>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  s = s.replace(/^---+$/gm, "<hr>");
  // tables
  s = s.replace(/(?:^|\n)((?:\|.*\|[ \t]*\n)(?:\|[\s:|-]+\|[ \t]*\n)(?:\|.*\|[ \t]*(?:\n|$))*)/g, (_m, tbl: string) => {
    const rows = tbl.trim().split("\n").filter((_r, i) => i !== 1);
    const cells = (r: string) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    const head = cells(rows[0]).map((c) => `<th>${c}</th>`).join("");
    const body = rows.slice(1).map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
    return `\n<div class="gp-tblwrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>\n`;
  });
  s = s.replace(/(?:^|\n)((?:&gt; ?.*(?:\n|$))+)/g, (_m, b: string) => `\n<blockquote>${b.trim().split("\n").map((l) => l.replace(/^&gt; ?/, "")).join("<br>")}</blockquote>\n`);
  s = s.replace(/(?:^|\n)((?:[-*•] .*(?:\n|$))+)/g, (_m, b: string) => `\n<ul>${b.trim().split("\n").map((l) => `<li>${l.replace(/^[-*•] /, "")}</li>`).join("")}</ul>\n`);
  s = s.replace(/(?:^|\n)((?:\d+[.)] .*(?:\n|$))+)/g, (_m, b: string) => `\n<ol>${b.trim().split("\n").map((l) => `<li>${l.replace(/^\d+[.)] /, "")}</li>`).join("")}</ol>\n`);
  s = s
    .split(/\n{2,}/)
    .map((c) => {
      const t = c.trim();
      if (!t) return "";
      if (/^<(h[1-3]|ul|ol|pre|div|blockquote|hr|table)/.test(t) || /^\u0000B\d+\u0000$/.test(t)) return t;
      return `<p>${t.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
  s = s.replace(/\u0000B(\d+)\u0000/g, (_m, i) => blocks[Number(i)]);
  return s;
}

// Plain text for read-aloud
export function speakable(raw: string): string {
  return displayText(raw)
    .replace(/```[\s\S]*?```/g, " (code block) ")
    .replace(/[#*_`>|]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Group conversations for the sidebar
export function groupConvos(list: Convo[], q: string): { label: string; items: Convo[] }[] {
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? list.filter((c) => (c.title || "").toLowerCase().includes(needle) || c.messages.some((m) => m.content.toLowerCase().includes(needle)))
    : list;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86400000;
  const groups: Record<string, Convo[]> = { Pinned: [], Today: [], Yesterday: [], "Previous 7 days": [], Older: [] };
  [...filtered].sort((a, b) => b.ts - a.ts).forEach((c) => {
    if (c.pinned) groups.Pinned.push(c);
    else if (c.ts >= start) groups.Today.push(c);
    else if (c.ts >= start - day) groups.Yesterday.push(c);
    else if (c.ts >= start - 7 * day) groups["Previous 7 days"].push(c);
    else groups.Older.push(c);
  });
  return Object.entries(groups).filter(([, v]) => v.length).map(([label, items]) => ({ label, items }));
}

export function convoToMarkdown(c: Convo): string {
  const lines = [`# ${c.title || "Greenprint AI chat"}`, "", `_Exported from The Greenprint AI, ${new Date(c.ts).toLocaleString()}_`, ""];
  c.messages.forEach((m) => {
    lines.push(m.role === "user" ? "## You" : "## Greenprint AI");
    lines.push(m.role === "user" ? m.content : displayText(m.content));
    if (m.files?.length) lines.push(`_Attached: ${m.files.map((f) => f.name).join(", ")}_`);
    lines.push("");
  });
  return lines.join("\n");
}

export function downloadText(name: string, text: string, type = "text/markdown") {
  try {
    const blob = new Blob([text], { type });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 500);
  } catch {}
}

// Read text out of an uploaded file, in the browser (no server cost).
const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|js|jsx|ts|tsx|py|html|htm|css|xml|yml|yaml|log|sql|java|c|cpp|go|rs|rb|php|sh|ini|env\.example)$/i;
export const FILE_ACCEPT = "image/*,.pdf,.txt,.md,.csv,.tsv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.xml,.yml,.yaml,.log,.sql";
export const MAX_FILE_CHARS = 20000;

let pdfjsPromise: Promise<any> | null = null;
function loadPdfJs(): Promise<any> {
  if (!pdfjsPromise) {
    const base = "/vendor/pdfjs-4.4.168/";
    pdfjsPromise = import(/* webpackIgnore: true */ base + "pdf.min.mjs").then((m: any) => {
      m.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.mjs";
      return m;
    });
  }
  return pdfjsPromise;
}

export async function extractFileText(f: File): Promise<string> {
  if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") {
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
    let out = "";
    const pages = Math.min(doc.numPages, 60);
    for (let p = 1; p <= pages && out.length < MAX_FILE_CHARS; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      out += tc.items.map((it: any) => it.str).join(" ") + "\n\n";
    }
    if (!out.trim()) throw new Error("This PDF has no readable text (it may be a scan).");
    return out.slice(0, MAX_FILE_CHARS);
  }
  if (TEXT_EXT.test(f.name) || f.type.startsWith("text/") || f.type === "application/json") {
    return (await f.text()).slice(0, MAX_FILE_CHARS);
  }
  throw new Error("That file type isn't supported yet.");
}

// Message content sent to the engine, with any attached file bodies inlined.
export function wireContent(m: Msg): string {
  if (!m.files?.length) return m.content;
  const docs = m.files.map((f) => `[Attached file: ${f.name}]\n"""\n${f.text}\n"""`).join("\n\n");
  return `${docs}\n\n${m.content}`;
}
