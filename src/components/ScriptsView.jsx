import { useState } from "react";
import { T } from "../theme";
import { shortDate, uid } from "../lib/util";
import { create, remove, update } from "../lib/store";
import { FORMATS, newScript } from "../lib/formats";
import ScriptEditor from "./ScriptEditor";
import { ChoiceGrid, Empty, IBtn, MobileBar, Modal, SbRow, Sidebar } from "./common";

export default function ScriptsView({ scripts, outlines, activeId, onSelect, mob, onOpenOutline, picking, setPicking }) {
  const [filter, setFilter] = useState(null);
  const active = scripts.find(s => s.id === activeId);
  const shown = filter ? scripts.filter(s => (s.format || "film") === filter) : scripts;
  const add = () => setPicking(true);
  const pick = format => { setPicking(false); onSelect(create("script", newScript(format)).id); };
  const dup = s => onSelect(create("script", { ...s, id: undefined, created: undefined, title: s.title + " (copy)", blocks: s.blocks.map(b => ({ ...b, id: uid() })) }).id);
  const del = s => { if (confirm(`Delete “${s.title}”?`)) { remove(s.id); onSelect(null); } };
  const outline = active?.outlineId && outlines.find(o => o.id === active.outlineId);

  return <>
    <Sidebar label="Scripts" onAdd={add} mobOpen={mob.open} onMobClose={mob.close}
      top={(
        <div style={{padding:"8px 10px",borderBottom:`1px solid ${T.border}`,display:"flex",flexWrap:"wrap",gap:"4px"}}>
          {Object.entries(FORMATS).map(([id, f]) => (
            <span key={id} onClick={()=>setFilter(filter===id?null:id)}
              style={{padding:"2px 8px",borderRadius:"10px",fontSize:"10px",cursor:"pointer",userSelect:"none",background:filter===id?T.accent:T.card,color:filter===id?T.bg:T.textSec,border:`1px solid ${filter===id?T.accent:T.border}`}}>
              {f.icon} {f.label}
            </span>
          ))}
        </div>
      )}
      footer="Double-click a title to rename">
      {shown.map(s => (
        <SbRow key={s.id} active={s.id === activeId} icon={FORMATS[s.format]?.icon || "📄"} title={s.title}
          onSelect={()=>onSelect(s.id)} onRename={t=>update(s.id,{title:t})}
          sub={`${FORMATS[s.format]?.label || "Film"} · ${shortDate(s.updated || s.created)}`}
          actions={<><IBtn label="dup" onClick={()=>dup(s)} /><IBtn label="del" danger onClick={()=>del(s)} /></>} />
      ))}
    </Sidebar>
    <main style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      {active
        ? <ScriptEditor key={active.id} script={active} onUpdate={u=>update(active.id,u)}
            outline={outline} onOpenOutline={()=>onOpenOutline(outline.id)} />
        : <Empty icon="📄" text="Write a film script, a TV/sitcom episode or a sketch. Exports to PDF and Fountain." action="New Script" onAction={add} />}
    </main>
    <MobileBar label={active?.title || "Scripts"} onOpen={mob.openIt} onAdd={add} />
    {picking && (
      <Modal title="New script" sub="Pick a format" onClose={()=>setPicking(false)}>
        <ChoiceGrid onPick={pick} options={Object.entries(FORMATS).map(([id, f]) => ({ id, icon: f.icon, label: f.label, desc: f.desc }))} />
      </Modal>
    )}
  </>;
}
