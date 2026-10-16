import { useState } from "react";
import { T, btn, label } from "../theme";
import { avgRating, download, estRuntime, fileName, mmss } from "../lib/util";
import { create, remove, update } from "../lib/store";
import { Empty, IBtn, MobileBar, SbRow, Sidebar } from "./common";

function exportSet(set, bits) {
  const sb = set.bitIds.map(id => bits.find(b => b.id === id)).filter(Boolean);
  const total = sb.reduce((s, b) => s + estRuntime(b), 0);
  let out = `${set.title.toUpperCase()}\nRuntime: ${mmss(total)}\n\n${"─".repeat(50)}\n\n`;
  let running = 0;
  sb.forEach((b, i) => {
    const rt = estRuntime(b); running += rt;
    out += `${i + 1}. ${b.title}  (${mmss(rt)})  →  ${mmss(running)} running\n`;
    if (b.tags?.length) out += `   [${b.tags.join(", ")}]\n`;
    out += `\n   SETUP:\n   ${b.setup}\n\n   PUNCHLINE:\n   ${b.punchline}\n\n${"─".repeat(50)}\n\n`;
  });
  download(fileName(set.title, "_set.txt"), out);
}

export default function SetsView({ sets, bits, activeId, onSelect, mob }) {
  const active = sets.find(s => s.id === activeId);
  const add = () => onSelect(create("set", { title: "New Set", bitIds: [] }).id);
  const del = s => { if (confirm(`Delete set “${s.title}”? (Bits stay.)`)) { remove(s.id); onSelect(null); } };
  return <>
    <Sidebar label="Sets" onAdd={add} mobOpen={mob.open} onMobClose={mob.close}>
      {sets.map(s => (
        <SbRow key={s.id} active={s.id === activeId} icon="🎬" title={s.title} onSelect={()=>onSelect(s.id)}
          onRename={t=>update(s.id,{title:t})}
          sub={`${s.bitIds.length} bit${s.bitIds.length !== 1 ? "s" : ""}`}
          actions={<IBtn label="del" danger onClick={()=>del(s)} />} />
      ))}
    </Sidebar>
    <main style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      {active
        ? <SetEditor key={active.id} set={active} bits={bits} onUpdate={u=>update(active.id,u)} />
        : <Empty icon="🎬" text="Sets are running orders of bits with live timing." action="New Set" onAction={add} />}
    </main>
    <MobileBar label={active?.title || "Sets"} onOpen={mob.openIt} onAdd={add} />
  </>;
}

function SetEditor({ set, bits, onUpdate }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const inSet = set.bitIds.map(id => bits.find(b => b.id === id)).filter(Boolean);
  const available = bits.filter(b => !set.bitIds.includes(b.id));
  const total = inSet.reduce((s, b) => s + estRuntime(b), 0);
  const move = (from, to) => {
    if (to < 0 || to >= set.bitIds.length || from === to) return;
    const ids = [...set.bitIds];
    const [x] = ids.splice(from, 1);
    ids.splice(to, 0, x);
    onUpdate({ bitIds: ids });
  };
  let running = 0;
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"8px 16px",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0,display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
        <input value={set.title} onChange={e=>onUpdate({title:e.target.value})} aria-label="Set title"
          style={{background:"transparent",border:"none",outline:"none",color:T.text,fontSize:"14px",fontWeight:"600",flex:1,minWidth:"120px",caretColor:T.accent}} />
        <span style={{fontSize:"11px",color:T.accent,fontWeight:"600",whiteSpace:"nowrap"}}>⏱ {mmss(total)} total</span>
        <button onClick={()=>exportSet(set, bits)} className="top-btn" style={btn.ghost}>↓ Export</button>
      </div>
      <div className="editor-pad" style={{flex:1,overflowY:"auto",padding:"20px",background:T.bg,display:"flex",gap:"20px",alignItems:"flex-start",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:"240px"}}>
          <div style={{...label,marginBottom:"12px"}}>Running order: drag or use ↑↓</div>
          {inSet.length === 0 && <div style={{padding:"40px",textAlign:"center",border:`2px dashed ${T.border}`,borderRadius:"10px",color:T.textMuted,fontSize:"12px"}}>Tap bits from the list to add them</div>}
          {inSet.map((b, i) => {
            const rt = estRuntime(b); running += rt;
            const over = dragOver === i && dragIdx !== null && dragIdx !== i;
            const avg = avgRating(b.performances);
            return (
              <div key={b.id} draggable
                onDragStart={e=>{setDragIdx(i);e.dataTransfer.effectAllowed="move";}}
                onDragOver={e=>{e.preventDefault();setDragOver(i);}}
                onDrop={e=>{e.preventDefault();if(dragIdx!==null)move(dragIdx,i);setDragIdx(null);setDragOver(null);}}
                onDragEnd={()=>{setDragIdx(null);setDragOver(null);}}
                style={{padding:"10px 12px",background:T.card,border:`1px solid ${over?T.accent:T.border}`,borderTop:over?`3px solid ${T.accent}`:`1px solid ${T.border}`,borderRadius:"8px",marginBottom:"7px",cursor:"grab",opacity:dragIdx===i?0.45:1,userSelect:"none",display:"flex",alignItems:"center",gap:"8px"}}>
                <span style={{color:T.accent,fontSize:"11px",fontWeight:"700",minWidth:"20px",fontFamily:T.mono}}>{i + 1}.</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"12.5px",fontWeight:"500",color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.title}</div>
                  <div style={{display:"flex",gap:"12px",fontSize:"10px",color:T.textSec,marginTop:"2px"}}>
                    <span style={{color:T.accent}}>{mmss(rt)}</span>
                    <span style={{color:T.textMuted}}>→ {mmss(running)}</span>
                    {avg && <span>★ {avg}</span>}
                  </div>
                </div>
                <IBtn label="↑" onClick={()=>move(i,i-1)} />
                <IBtn label="↓" onClick={()=>move(i,i+1)} />
                <IBtn label="×" danger onClick={()=>onUpdate({bitIds:set.bitIds.filter(id=>id!==b.id)})} />
              </div>
            );
          })}
        </div>
        {available.length > 0 && (
          <div style={{width:"200px",flexShrink:0}}>
            <div style={{...label,marginBottom:"12px"}}>Available bits</div>
            {available.map(b => (
              <div key={b.id} className="hover-accent" onClick={()=>onUpdate({bitIds:[...set.bitIds,b.id]})}
                style={{padding:"9px 11px",background:T.card,border:`1px solid ${T.border}`,borderRadius:"8px",marginBottom:"6px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:"11.5px",color:T.textSec,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>＋ {b.title}</span>
                <span style={{fontSize:"10px",color:T.accent,marginLeft:"6px",flexShrink:0}}>{mmss(estRuntime(b))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
