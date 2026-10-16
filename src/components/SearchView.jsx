import { T, input } from "../theme";
import { BLOCKS, SKETCH_FIELDS } from "../lib/formats";

const KINDS = {
  idea:    { icon: "💡", name: "idea",    color: T.purple },
  outline: { icon: "🗂", name: "outline", color: T.blue },
  script:  { icon: "📄", name: "script",  color: T.accent },
  bit:     { icon: "🎤", name: "bit",     color: T.green },
};

function Highlight({ text, q }) {
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <span>{text.slice(0, 120)}{text.length > 120 ? "…" : ""}</span>;
  const start = Math.max(0, idx - 40), snip = text.slice(start, start + 140), lo = idx - start;
  return <span>{start > 0 && "…"}{snip.slice(0, lo)}<mark style={{background:T.accentDim,color:T.accent,borderRadius:"2px",padding:"0 2px"}}>{snip.slice(lo, lo + q.length)}</mark>{snip.slice(lo + q.length)}{start + 140 < text.length && "…"}</span>;
}

export default function SearchView({ query, setQuery, data, onOpen }) {
  const q = query.trim().toLowerCase();
  const results = [];
  if (q.length >= 2) {
    const hit = (kind, doc, label, text) => {
      if (text && text.toLowerCase().includes(q)) results.push({ kind, id: doc.id, title: doc.title || doc.text?.slice(0, 50), label, text });
    };
    data.ideas.forEach(i => hit("idea", i, "idea", i.text));
    data.outlines.forEach(o => {
      hit("outline", o, "title", o.title);
      o.nodes?.forEach(n => { hit("outline", o, "beat", n.text); hit("outline", o, "note", n.note); });
    });
    data.scripts.forEach(s => {
      hit("script", s, "title", s.title);
      s.blocks.forEach(b => hit("script", s, BLOCKS[b.type]?.label || b.type, b.text));
      if (s.format === "sketch") SKETCH_FIELDS.forEach(([k, l]) => hit("script", s, l, s.meta?.[k]));
    });
    data.bits.forEach(b => [["title", b.title], ["setup", b.setup], ["punchline", b.punchline], ["notes", b.notes]].forEach(([l, t]) => hit("bit", b, l, t)));
  }
  const capped = results.slice(0, 200);

  return (
    <main style={{flex:1,overflowY:"auto",background:T.bg}}>
      <div className="editor-pad" style={{maxWidth:"640px",margin:"0 auto",padding:"24px 20px 100px"}}>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search ideas, outlines, scripts and bits…" autoFocus
          style={{...input,width:"100%",fontSize:"15px",padding:"11px 14px",borderColor:T.borderLight,marginBottom:"18px"}} />
        {q.length < 2 && <div style={{textAlign:"center",padding:"40px",color:T.textMuted,fontSize:"12px"}}>Type 2+ characters</div>}
        {q.length >= 2 && results.length === 0 && <div style={{textAlign:"center",padding:"40px",color:T.textMuted,fontSize:"12px"}}>No results for “{query}”</div>}
        {capped.length > 0 && <div style={{fontSize:"10px",color:T.textMuted,marginBottom:"10px"}}>{results.length} result{results.length !== 1 ? "s" : ""}</div>}
        {capped.map((r, i) => {
          const k = KINDS[r.kind];
          return (
            <div key={i} className="hover-accent" onClick={()=>onOpen(r.kind, r.id)}
              style={{padding:"11px 14px",background:T.card,border:`1px solid ${T.border}`,borderRadius:"8px",marginBottom:"7px",cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"5px",minWidth:0}}>
                <span>{k.icon}</span>
                <span style={{fontSize:"12px",fontWeight:"600",color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</span>
                <span style={{fontSize:"10px",color:k.color,border:`1px solid ${k.color}55`,padding:"0 6px",borderRadius:"8px",flexShrink:0}}>{r.label}</span>
                <span style={{fontSize:"10px",color:T.textMuted,marginLeft:"auto",flexShrink:0}}>{k.name} ↗</span>
              </div>
              <div style={{fontSize:"11.5px",color:T.textSec,fontFamily:T.mono,lineHeight:"1.5"}}><Highlight text={r.text} q={q} /></div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
