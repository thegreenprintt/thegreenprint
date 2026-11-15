"use client";

import { useEffect, useRef, useState } from "react";

// Live build preview. Renders the partial site as it streams, using two stacked
// iframes: the next draft loads in the hidden one, then fades in over the old one.
// No blank flashes, no flicker.
const INJECT =
  "<script>(function(){function fix(){try{var els=document.body?document.body.getElementsByTagName('*'):[];" +
  "for(var i=0;i<els.length;i++){var e=els[i],s=getComputedStyle(e);if(s.opacity==='0'&&s.display!=='none'){e.style.opacity='1';e.style.transform='none';e.style.transition='none'}}" +
  "window.scrollTo(0,document.documentElement.scrollHeight)}catch(x){}}" +
  "if(document.readyState!=='loading')setTimeout(fix,40);else document.addEventListener('DOMContentLoaded',function(){setTimeout(fix,40)})})()<\/script>";

export function draftDoc(partial: string): string {
  let h = partial;
  // drop an unfinished tag at the very end
  const lt = h.lastIndexOf("<"), gt = h.lastIndexOf(">");
  if (lt > gt) h = h.slice(0, lt);
  // never leave a script open (it would swallow the rest); close an open style block
  const so = h.toLowerCase().lastIndexOf("<script"), sc = h.toLowerCase().lastIndexOf("</script>");
  if (so > sc) h = h.slice(0, so);
  const yo = h.toLowerCase().lastIndexOf("<style"), yc = h.toLowerCase().lastIndexOf("</style>");
  if (yo > yc) h += "</style>";
  return h + INJECT;
}

export function LivePreview({ html }: { html: string }) {
  const [docs, setDocs] = useState<[string, string]>(["", ""]);
  const [front, setFront] = useState(0);
  const pending = useRef<number | null>(null);

  useEffect(() => {
    if (!html) return;
    const back = front === 0 ? 1 : 0;
    pending.current = back;
    setDocs((d) => { const n: [string, string] = [d[0], d[1]]; n[back] = draftDoc(html); return n; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  return (
    <div className="absolute inset-0 bg-white overflow-hidden">
      {[0, 1].map((k) => (
        <iframe key={k} title={k === front ? "Live build" : "Live build buffer"} srcDoc={docs[k]}
          onLoad={() => { if (pending.current === k && docs[k]) { setFront(k); pending.current = null; } }}
          sandbox="allow-scripts"
          className="absolute inset-0 w-full h-full border-0 bg-white"
          style={{ opacity: k === front ? 1 : 0, zIndex: k === front ? 2 : 1, transition: "opacity 0.35s ease", pointerEvents: k === front ? "auto" : "none" }} />
      ))}
    </div>
  );
}
