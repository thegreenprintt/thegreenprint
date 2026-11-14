"use client";

import { useEffect, useMemo, useState } from "react";

// Trading calculators. Pure math in the browser, no AI cost.
export type ToolTab = "size" | "rr";

const num = (v: string) => {
  const n = parseFloat(String(v).replace(/[$,%\s]/g, ""));
  return isFinite(n) ? n : NaN;
};
const money = (n: number) => (isFinite(n) ? n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }) : "-");
const fmt = (n: number, d = 2) => (isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "-");

function useStored(key: string, init: string): [string, (v: string) => void] {
  const [v, setV] = useState(init);
  useEffect(() => { try { const s = localStorage.getItem(key); if (s !== null) setV(s); } catch {} }, [key]);
  return [v, (x: string) => { setV(x); try { localStorage.setItem(key, x); } catch {} }];
}

function Field({ label, value, onChange, prefix, suffix, hint }: { label: string; value: string; onChange: (v: string) => void; prefix?: string; suffix?: string; hint?: string }) {
  return (
    <label className="gp-tf">
      <span className="gp-tf-l">{label}{hint && <em>{hint}</em>}</span>
      <span className="gp-tf-box">
        {prefix && <span className="gp-tf-fix">{prefix}</span>}
        <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="gp-tf-fix">{suffix}</span>}
      </span>
    </label>
  );
}

export function TradingTools({ tab, setTab, onClose, onAsk }: { tab: ToolTab; setTab: (t: ToolTab) => void; onClose: () => void; onAsk: (prompt: string) => void }) {
  // position size
  const [acct, setAcct] = useStored("gpt_acct", "5000");
  const [riskPct, setRiskPct] = useStored("gpt_risk", "1");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [mult, setMult] = useStored("gpt_mult", "1");
  // risk / reward
  const [rEntry, setREntry] = useState("");
  const [rStop, setRStop] = useState("");
  const [rTarget, setRTarget] = useState("");

  const size = useMemo(() => {
    const A = num(acct), P = num(riskPct), E = num(entry), S = num(stop), M = num(mult) || 1;
    const riskCash = A * (P / 100);
    const perUnit = Math.abs(E - S) * M;
    const units = perUnit > 0 ? Math.floor(riskCash / perUnit) : NaN;
    return {
      ok: isFinite(riskCash) && perUnit > 0 && E > 0,
      riskCash, perUnit, units,
      value: units * E * (M === 1 ? 1 : 0) || units * E,
      actualRisk: units * perUnit,
      side: E > S ? "Long" : "Short",
    };
  }, [acct, riskPct, entry, stop, mult]);

  const rr = useMemo(() => {
    const E = num(rEntry), S = num(rStop), T = num(rTarget);
    const risk = Math.abs(E - S), reward = Math.abs(T - E);
    const R = risk > 0 ? reward / risk : NaN;
    const valid = isFinite(R) && ((E > S && T > E) || (E < S && T < E));
    return { ok: isFinite(R) && risk > 0 && reward > 0, valid, risk, reward, R, be: isFinite(R) ? 100 / (1 + R) : NaN, side: E > S ? "Long" : "Short" };
  }, [rEntry, rStop, rTarget]);

  return (
    <div className="gp-tools">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="gp-memtitle">Trading tools</h3>
        <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-lg border border-white/10 text-muted hover:text-text transition-colors" aria-label="Close">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="px-5">
        <div className="flex gap-0.5 gp-tabs rounded-lg p-0.5 w-fit">
          <button onClick={() => setTab("size")} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${tab === "size" ? "gp-tab-on" : "text-muted"}`}>Position size</button>
          <button onClick={() => setTab("rr")} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${tab === "rr" ? "gp-tab-on" : "text-muted"}`}>Risk / reward</button>
        </div>
      </div>

      {tab === "size" ? (
        <div className="px-5 pt-4 pb-5">
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Account size" prefix="$" value={acct} onChange={setAcct} />
            <Field label="Risk per trade" suffix="%" value={riskPct} onChange={setRiskPct} />
            <Field label="Entry price" prefix="$" value={entry} onChange={setEntry} />
            <Field label="Stop loss" prefix="$" value={stop} onChange={setStop} />
          </div>
          <div className="mt-2.5"><Field label="Value per 1.00 move" hint="1 for stocks, point value for futures" value={mult} onChange={setMult} /></div>
          <div className="gp-tout">
            <div className="gp-tout-big"><span>Position size</span><b>{size.ok ? `${fmt(size.units, 0)} ${num(mult) === 1 ? "shares" : "contracts"}` : "Enter entry and stop loss"}</b></div>
            <div className="gp-tout-row"><span>Max risk ({fmt(num(riskPct))}%)</span><b>{money(size.riskCash)}</b></div>
            <div className="gp-tout-row"><span>Risk per {num(mult) === 1 ? "share" : "contract"}</span><b>{size.ok ? money(size.perUnit) : "-"}</b></div>
            {num(mult) === 1 && <div className="gp-tout-row"><span>Position value</span><b>{size.ok ? money(size.units * num(entry)) : "-"}</b></div>}
            <div className="gp-tout-row"><span>Actual risk if stop loss is hit</span><b>{size.ok ? money(size.actualRisk) : "-"}</b></div>
            {size.ok && <div className="gp-tout-row"><span>Direction</span><b>{size.side}</b></div>}
          </div>
          <button disabled={!size.ok} className="gp-tools-ask" onClick={() => onAsk(`I have a ${money(num(acct))} account and risk ${fmt(num(riskPct))}% per trade. ${size.side} entry at ${num(entry)}, stop loss at ${num(stop)}${num(mult) !== 1 ? `, ${num(mult)} per point` : ""}. The calculator says ${fmt(size.units, 0)} ${num(mult) === 1 ? "shares" : "contracts"}, risking ${money(size.actualRisk)}. Sanity check this for me and tell me what to watch out for.`)}>
            Ask the AI about this trade
          </button>
        </div>
      ) : (
        <div className="px-5 pt-4 pb-5">
          <div className="grid grid-cols-3 gap-2.5">
            <Field label="Entry" value={rEntry} onChange={setREntry} />
            <Field label="Stop loss" value={rStop} onChange={setRStop} />
            <Field label="Target" value={rTarget} onChange={setRTarget} />
          </div>
          <div className="gp-tout">
            <div className="gp-tout-big"><span>Risk to reward</span><b>{rr.ok ? `1 : ${fmt(rr.R)}` : "Enter all three prices"}</b></div>
            {rr.ok && !rr.valid && <div className="gp-tout-warn">Your target and stop loss are on the same side of entry. Double check the prices.</div>}
            <div className="gp-tout-row"><span>Risk per unit</span><b>{rr.ok ? fmt(rr.risk, 4) : "-"}</b></div>
            <div className="gp-tout-row"><span>Reward per unit</span><b>{rr.ok ? fmt(rr.reward, 4) : "-"}</b></div>
            <div className="gp-tout-row"><span>Win rate needed to break even</span><b>{rr.ok ? `${fmt(rr.be, 1)}%` : "-"}</b></div>
            {rr.ok && <div className="gp-tout-row"><span>Direction</span><b>{rr.side}</b></div>}
          </div>
          <button disabled={!rr.ok} className="gp-tools-ask" onClick={() => onAsk(`${rr.side} trade idea: entry ${num(rEntry)}, stop loss ${num(rStop)}, target ${num(rTarget)}. That's a 1:${fmt(rr.R)} risk to reward, so I need to win about ${fmt(rr.be, 1)}% of the time to break even. Is this a good trade structure? What would you adjust?`)}>
            Ask the AI about this setup
          </button>
        </div>
      )}
      <div className="px-5 pb-4 text-[11px] text-muted">Math only, not financial advice. Saved on this device.</div>
    </div>
  );
}
