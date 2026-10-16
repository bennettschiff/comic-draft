import { useState } from "react";
import { T, btn, input } from "../theme";
import { avgRating, estRuntime, uid, wc } from "../lib/util";
import { create, remove, update } from "../lib/store";
import { Empty, IBtn, MobileBar, Modal, SbRow, Sidebar } from "./common";

export const newBit = (extra = {}) => ({ title: "New Bit", setup: "", punchline: "", tags: [], notes: "", duration: null, performances: [], ...extra });
const newPerf = () => ({ id: uid(), date: new Date().toISOString().slice(0, 10), venue: "", rating: 3, notes: "" });

export default function StandupView({ bits, scripts, activeId, onSelect, mob, onBitToScript }) {
  const [tagFilter, setTagFilter] = useState(null);
  const [perfOpen, setPerfOpen] = useState(false);
  const allTags = [...new Set(bits.flatMap(b => b.tags || []))].sort();
  const shown = tagFilter ? bits.filter(b => b.tags?.includes(tagFilter)) : bits;
  const active = bits.find(b => b.id === activeId);
  const add = () => onSelect(create("bit", newBit()).id);
  const dup = b => onSelect(create("bit", { ...b, id: undefined, title: b.title + " (copy)", performances: [], created: undefined }).id);
  const del = b => { if (confirm(`Delete “${b.title}”?`)) { remove(b.id); onSelect(null); } };

  return <>
    <Sidebar label="Bits" onAdd={add} mobOpen={mob.open} onMobClose={mob.close}
      top={allTags.length > 0 && (
        <div style={{padding:"8px 10px",borderBottom:`1px solid ${T.border}`,display:"flex",flexWrap:"wrap",gap:"4px"}}>
          {allTags.map(t => (
            <span key={t} onClick={()=>setTagFilter(tagFilter===t?null:t)}
              style={{padding:"2px 7px",borderRadius:"10px",fontSize:"10px",cursor:"pointer",userSelect:"none",background:tagFilter===t?T.accent:T.card,color:tagFilter===t?T.bg:T.textSec,border:`1px solid ${tagFilter===t?T.accent:T.border}`}}>{t}</span>
          ))}
        </div>
      )}
      footer={`${bits.length} bit${bits.length !== 1 ? "s" : ""} · ${bits.reduce((s, b) => s + estRuntime(b), 0).toFixed(1)} min total`}>
      {shown.map(b => (
        <SbRow key={b.id} active={b.id === activeId} icon="🎤" title={b.title} onSelect={()=>onSelect(b.id)}
          onRename={t=>update(b.id,{title:t})}
          sub={b.tags?.length ? b.tags.slice(0, 3).join(" · ") : null}
          actions={<><IBtn label="dup" onClick={()=>dup(b)} /><IBtn label="del" danger onClick={()=>del(b)} /></>} />
      ))}
    </Sidebar>
    <main style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      {active
        ? <BitEditor key={active.id} bit={active} onUpdate={u=>update(active.id,u)} scripts={scripts}
            onBitToScript={onBitToScript} onShowPerf={()=>setPerfOpen(true)} />
        : <Empty icon="🎤" text="Bits are setup + punchline, with tags, stage time and a performance log." action="New Bit" onAction={add} />}
    </main>
    <MobileBar label={active?.title || "Bits"} onOpen={mob.openIt} onAdd={add} />
    {perfOpen && active && <PerfModal bit={active} onUpdate={u=>update(active.id,u)} onClose={()=>setPerfOpen(false)} />}
  </>;
}

function Label({ e, l, color, sub }) {
  return (
    <div style={{fontSize:"10px",fontWeight:"600",letterSpacing:"0.1em",color,textTransform:"uppercase",display:"flex",alignItems:"center",gap:"6px",marginBottom:"9px"}}>
      <span style={{fontSize:"13px"}}>{e}</span><span>{l}</span>
      {sub && <span style={{fontWeight:"400",color:T.textMuted,marginLeft:"4px",fontSize:"9px",textTransform:"none"}}>{sub}</span>}
    </div>
  );
}

function BitEditor({ bit, onUpdate, scripts, onBitToScript, onShowPerf }) {
  const [tagInput, setTagInput] = useState("");
  const [showBridge, setShowBridge] = useState(false);
  const [target, setTarget] = useState(scripts[0]?.id || "new");
  const tags = bit.tags || [], perfs = bit.performances || [];
  const addTag = raw => {
    const t = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (t && !tags.includes(t)) onUpdate({ tags: [...tags, t] });
    setTagInput("");
  };
  const ta = {width:"100%",background:T.card,border:`1px solid ${T.border}`,borderRadius:"8px",color:T.text,padding:"14px 16px",fontSize:"13.5px",fontFamily:T.mono,lineHeight:"1.8",resize:"vertical",outline:"none",caretColor:T.accent};
  const avg = avgRating(perfs);

  return (
    <div className="editor-pad" style={{flex:1,overflowY:"auto",padding:"28px 36px 80px",background:T.bg}}>
      <div style={{maxWidth:"660px",margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:"12px",marginBottom:"24px",flexWrap:"wrap"}}>
          <input value={bit.title} onChange={e=>onUpdate({title:e.target.value})} placeholder="Bit title..."
            style={{flex:1,minWidth:"160px",background:"transparent",border:"none",borderBottom:`2px solid ${T.accent}`,outline:"none",color:T.text,fontSize:"20px",fontWeight:"600",paddingBottom:"8px",caretColor:T.accent}} />
          <div style={{display:"flex",gap:"6px",flexShrink:0,paddingBottom:"10px"}}>
            <button onClick={onShowPerf} style={btn.ghost}>🎭 Log {avg && <span style={{color:T.accent}}>★{avg}</span>}</button>
            <button onClick={()=>setShowBridge(s=>!s)} style={{...btn.ghost,borderColor:showBridge?T.blue:T.borderLight,color:showBridge?T.blue:T.textSec}}>📄 → Script</button>
          </div>
        </div>

        {showBridge && (
          <div style={{background:T.card,border:`1px solid ${T.blue}`,borderRadius:"8px",padding:"14px 16px",marginBottom:"24px"}}>
            <div style={{fontSize:"11px",color:T.blue,fontWeight:"600",marginBottom:"10px",letterSpacing:"0.05em",textTransform:"uppercase"}}>Add this bit to a script as a scene</div>
            <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
              <select value={target} onChange={e=>setTarget(e.target.value)} style={{...input,flex:1,minWidth:"160px",background:T.bg}}>
                <option value="new">＋ New sketch</option>
                {scripts.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              <button onClick={()=>onBitToScript(bit, target)} style={{...btn.primary,background:T.blue,color:"#fff"}}>Add as scene</button>
            </div>
          </div>
        )}

        <div style={{marginBottom:"22px"}}>
          <Label e="🏷" l="Tags" color={T.textSec} />
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px",alignItems:"center",background:T.card,border:`1px solid ${T.border}`,borderRadius:"8px",padding:"10px 13px",minHeight:"44px"}}>
            {tags.map(t => (
              <span key={t} style={{padding:"3px 10px",borderRadius:"12px",background:T.bg,border:`1px solid ${T.borderLight}`,color:T.accent,fontSize:"11px",display:"flex",alignItems:"center",gap:"5px"}}>
                {t}<span onClick={()=>onUpdate({tags:tags.filter(x=>x!==t)})} style={{cursor:"pointer",color:T.textMuted,fontSize:"14px",lineHeight:1}}>×</span>
              </span>
            ))}
            <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onBlur={()=>tagInput&&addTag(tagInput)}
              onKeyDown={e=>{if(e.key==="Enter"||e.key===","){e.preventDefault();addTag(tagInput);}if(e.key==="Backspace"&&tagInput===""&&tags.length)onUpdate({tags:tags.slice(0,-1)});}}
              placeholder={tags.length===0?"observational, travel, dark...":"add tag..."}
              style={{background:"transparent",border:"none",outline:"none",color:T.text,fontSize:"12px",minWidth:"100px",flex:1,caretColor:T.accent}} />
          </div>
        </div>

        <div style={{marginBottom:"22px",display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
          <Label e="⏱" l="Stage time" color={T.textSec} />
          <input type="number" step="0.5" min="0.5" max="60" inputMode="decimal"
            value={bit.duration||""} onChange={e=>onUpdate({duration:e.target.value?parseFloat(e.target.value):null})}
            placeholder={`~${estRuntime(bit)} min (auto)`} style={{...input,width:"140px"}} />
          <span style={{fontSize:"10px",color:T.textMuted}}>min, leave blank to estimate</span>
        </div>

        <div style={{marginBottom:"22px"}}>
          <Label e="🎯" l="Setup" color={T.green} sub={`${wc(bit.setup)} words`} />
          <textarea value={bit.setup} onChange={e=>onUpdate({setup:e.target.value})} rows={5}
            placeholder="Set the scene. Ground the audience in a recognizable reality." style={{...ta,borderColor:T.greenDim}} />
        </div>
        <div style={{marginBottom:"22px"}}>
          <Label e="💥" l="Punchline / Tags" color={T.accent} sub={`${wc(bit.punchline)} words`} />
          <textarea value={bit.punchline} onChange={e=>onUpdate({punchline:e.target.value})} rows={5}
            placeholder="The subversion. The misdirect. The reveal. Tags on new lines." style={{...ta,borderColor:"#4a3a12"}} />
        </div>
        <div style={{marginBottom:"28px"}}>
          <Label e="📝" l="Notes / Callbacks / Alt angles" color={T.textSec} />
          <textarea value={bit.notes} onChange={e=>onUpdate({notes:e.target.value})} rows={3}
            placeholder="Alt takes, callbacks, crowd work cues, mileage notes..." style={ta} />
        </div>

        <div style={{display:"flex",gap:"16px",fontSize:"10px",color:T.textMuted,paddingTop:"6px",borderTop:`1px solid ${T.border}`,flexWrap:"wrap"}}>
          <span>~{estRuntime(bit)} min</span>
          <span>{perfs.length} performance{perfs.length !== 1 ? "s" : ""}</span>
          {bit.created && <span style={{marginLeft:"auto"}}>Created {new Date(bit.created).toLocaleDateString()}</span>}
        </div>
      </div>
    </div>
  );
}

function PerfModal({ bit, onUpdate, onClose }) {
  const [form, setForm] = useState(newPerf());
  const [adding, setAdding] = useState(false);
  const perfs = bit.performances || [];
  const avg = avgRating(perfs);
  const addPerf = () => { onUpdate({ performances: [...perfs, { ...form }] }); setForm(newPerf()); setAdding(false); };
  const small = {fontSize:"10px",color:T.textMuted,marginBottom:"4px",textTransform:"uppercase"};
  return (
    <Modal title="🎭 Performance Log" sub={`${bit.title}${avg ? ` · ★ ${avg} avg (${perfs.length})` : ""}`} onClose={onClose}
      footer={!adding && <button onClick={()=>setAdding(true)} style={{...btn.primary,width:"100%",padding:"10px"}}>+ Log Performance</button>}>
      {perfs.length === 0 && !adding && <div style={{textAlign:"center",padding:"28px",color:T.textMuted,fontSize:"12px"}}>No performances logged yet</div>}
      {adding && (
        <div style={{padding:"12px",background:T.card,border:`1px solid ${T.borderLight}`,borderRadius:"8px",marginBottom:"8px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
            <div><div style={small}>Date</div><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{...input,width:"100%",background:T.bg}} /></div>
            <div><div style={small}>Venue</div><input value={form.venue} onChange={e=>setForm(f=>({...f,venue:e.target.value}))} placeholder="Club name..." style={{...input,width:"100%",background:T.bg}} /></div>
          </div>
          <div style={{marginBottom:"10px"}}>
            <div style={small}>Rating</div>
            <div style={{display:"flex",gap:"6px"}}>
              {[1,2,3,4,5].map(r => <button key={r} onClick={()=>setForm(f=>({...f,rating:r}))} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:"24px",opacity:r<=form.rating?1:0.25,padding:0,color:T.accent}}>★</button>)}
            </div>
          </div>
          <div style={{marginBottom:"10px"}}>
            <div style={small}>Notes</div>
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="What worked? What didn't?" rows={2} style={{...input,width:"100%",background:T.bg,resize:"none"}} />
          </div>
          <div style={{display:"flex",gap:"8px"}}>
            <button onClick={addPerf} style={btn.primary}>Save</button>
            <button onClick={()=>setAdding(false)} style={btn.ghost}>Cancel</button>
          </div>
        </div>
      )}
      {[...perfs].reverse().map(p => (
        <div key={p.id} style={{padding:"10px 12px",background:T.card,border:`1px solid ${T.border}`,borderRadius:"8px",marginBottom:"7px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px",gap:"8px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",minWidth:0}}>
              <span style={{fontSize:"12px",fontWeight:"600",color:T.text}}>{p.venue || "Unnamed venue"}</span>
              <span style={{fontSize:"11px",color:T.textSec}}>{p.date}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
              <span style={{fontSize:"12px",color:T.accent}}>{"★".repeat(p.rating)}{"☆".repeat(5 - p.rating)}</span>
              <IBtn label="×" danger onClick={()=>onUpdate({performances:perfs.filter(x=>x.id!==p.id)})} />
            </div>
          </div>
          {p.notes && <div style={{fontSize:"11px",color:T.textSec,fontStyle:"italic",lineHeight:"1.5"}}>{p.notes}</div>}
        </div>
      ))}
    </Modal>
  );
}
