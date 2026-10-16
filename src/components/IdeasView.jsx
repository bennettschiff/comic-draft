import { useState } from "react";
import { T, btn, input } from "../theme";
import { autoResize, byNewest, shortDate } from "../lib/util";
import { create, remove, update } from "../lib/store";
import { IBtn } from "./common";

const tagsOf = text => [...new Set((text.match(/#[\w-]+/g) || []).map(t => t.slice(1).toLowerCase()))];
const KIND_ICON = { bit: "🎤", script: "📄", outline: "🗂" };

export default function IdeasView({ ideas, onPromote, onOpen }) {
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("inbox");
  const [tag, setTag] = useState(null);
  const [editing, setEditing] = useState(null);

  const save = () => {
    const text = draft.trim();
    if (!text) return;
    create("idea", { text, tags: tagsOf(text), pinned: false });
    setDraft("");
  };

  const allTags = [...new Set(ideas.flatMap(i => i.tags || []))].sort();
  const counts = { inbox: ideas.filter(i => !i.promoted).length, pinned: ideas.filter(i => i.pinned).length, used: ideas.filter(i => i.promoted).length };
  const shown = ideas
    .filter(i => tab === "all" || (tab === "inbox" ? !i.promoted : tab === "pinned" ? i.pinned : i.promoted))
    .filter(i => !tag || i.tags?.includes(tag))
    .filter(i => !q.trim() || i.text.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (b.pinned - a.pinned) || byNewest(a, b));

  const tabBtn = (id, labelText) => (
    <button key={id} onClick={()=>setTab(id)}
      style={{background:tab===id?T.accent:"transparent",color:tab===id?T.bg:T.textSec,border:"none",padding:"5px 10px",borderRadius:"5px",cursor:"pointer",fontSize:"11px",fontWeight:"600"}}>
      {labelText}{counts[id] !== undefined ? ` ${counts[id]}` : ""}
    </button>
  );

  return (
    <main style={{flex:1,overflowY:"auto",background:T.bg}}>
      <div className="editor-pad" style={{maxWidth:"680px",margin:"0 auto",padding:"24px 20px 100px"}}>
        <div style={{background:T.card,border:`1px solid ${T.borderLight}`,borderRadius:"10px",padding:"12px 14px",marginBottom:"18px"}}>
          <textarea value={draft} rows={2} ref={autoResize}
            onChange={e=>{setDraft(e.target.value);autoResize(e.target);}}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();save();}}}
            placeholder="What's funny? A premise, a line, something you saw… add #tags"
            style={{width:"100%",background:"transparent",border:"none",outline:"none",resize:"none",color:T.text,fontSize:"15px",lineHeight:1.5,caretColor:T.accent,fontFamily:T.mono,overflow:"hidden"}} />
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"6px",gap:"8px"}}>
            <span className="mob-hide" style={{fontSize:"10px",color:T.textMuted}}>Enter to save · Shift+Enter for a new line</span>
            <button onClick={save} disabled={!draft.trim()} style={{...btn.primary,marginLeft:"auto",opacity:draft.trim()?1:0.4}}>Save idea</button>
          </div>
        </div>

        <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap",marginBottom:"10px"}}>
          <div style={{display:"flex",background:T.card,borderRadius:"7px",padding:"3px",border:`1px solid ${T.border}`}}>
            {tabBtn("inbox","Inbox")}{tabBtn("pinned","📌")}{tabBtn("used","Used")}{tabBtn("all","All")}
          </div>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Filter…" style={{...input,flex:"1 1 120px",minWidth:"100px"}} />
        </div>
        {allTags.length > 0 && (
          <div style={{display:"flex",gap:"4px",flexWrap:"wrap",marginBottom:"14px"}}>
            {allTags.map(t => (
              <span key={t} onClick={()=>setTag(tag===t?null:t)}
                style={{padding:"2px 8px",borderRadius:"10px",fontSize:"10.5px",cursor:"pointer",userSelect:"none",background:tag===t?T.accent:T.card,color:tag===t?T.bg:T.textSec,border:`1px solid ${tag===t?T.accent:T.border}`}}>#{t}</span>
            ))}
          </div>
        )}

        {shown.length === 0 && (
          <div style={{textAlign:"center",padding:"40px 20px",color:T.textMuted,fontSize:"12.5px",lineHeight:1.6}}>
            {ideas.length === 0 ? "Your inbox is empty. Jot down anything; you can turn it into a bit, a sketch or an outline later." : "Nothing here."}
          </div>
        )}

        {shown.map(i => (
          <div key={i.id} style={{background:T.card,border:`1px solid ${i.pinned?T.accentDim:T.border}`,borderRadius:"9px",padding:"11px 13px",marginBottom:"8px",opacity:i.promoted&&tab!=="used"&&tab!=="all"?0.6:1}}>
            {editing === i.id
              ? <textarea autoFocus defaultValue={i.text} ref={autoResize} rows={1}
                  onChange={e=>autoResize(e.target)}
                  onBlur={e=>{const text=e.target.value.trim(); if(text&&text!==i.text) update(i.id,{text,tags:tagsOf(text)}); setEditing(null);}}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();e.target.blur();} if(e.key==="Escape"){setEditing(null);}}}
                  style={{width:"100%",background:T.bg,border:`1px solid ${T.borderLight}`,borderRadius:"6px",outline:"none",resize:"none",color:T.text,fontSize:"13.5px",lineHeight:1.55,padding:"6px 8px",fontFamily:T.mono,caretColor:T.accent,overflow:"hidden"}} />
              : <div onClick={()=>setEditing(i.id)} style={{fontSize:"13.5px",lineHeight:1.55,color:T.text,whiteSpace:"pre-wrap",fontFamily:T.mono,cursor:"text",wordBreak:"break-word"}}>{i.text}</div>}
            <div style={{display:"flex",alignItems:"center",gap:"4px",marginTop:"8px",flexWrap:"wrap"}}>
              <span style={{fontSize:"10px",color:T.textMuted,marginRight:"6px"}}>{shortDate(i.created)}</span>
              {i.promoted && (
                <button onClick={()=>onOpen(i.promoted.kind, i.promoted.id)} style={{...btn.ghost,padding:"2px 8px",fontSize:"10px",color:T.green,borderColor:T.greenDim}}>
                  {KIND_ICON[i.promoted.kind]} opened as {i.promoted.kind} ↗
                </button>
              )}
              <span style={{flex:1}} />
              <IBtn label={i.pinned ? "📌 unpin" : "📌"} title="Pin" onClick={()=>update(i.id,{pinned:!i.pinned})} />
              <IBtn label="→ bit" onClick={()=>onPromote(i, "bit")} />
              <IBtn label="→ sketch" onClick={()=>onPromote(i, "sketch")} />
              <IBtn label="→ outline" onClick={()=>onPromote(i, "outline")} />
              <IBtn label="del" danger onClick={()=>{ if(confirm("Delete this idea?")) remove(i.id); }} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
