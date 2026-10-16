import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { T, btn } from "../theme";
import { autoResize, download, fileName, shortDate } from "../lib/util";
import { create, remove, update } from "../lib/store";
import { TEMPLATES, newNode, outlineFromTemplate } from "../lib/templates";
import { FORMATS, newBlock, newScript } from "../lib/formats";
import { BarBtn, ChoiceGrid, Empty, FocusBar, IBtn, MobileBar, Modal, SbRow, Sidebar } from "./common";

// ── Tree helpers (outline is a flat list of nodes with a depth) ──

const subtreeEnd = (nodes, i) => {
  let j = i + 1;
  while (j < nodes.length && nodes[j].depth > nodes[i].depth) j++;
  return j;
};
const hasKids = (nodes, i) => nodes[i + 1]?.depth > nodes[i].depth;

function visibleIndexes(nodes) {
  const out = [];
  let hideDeeperThan = Infinity;
  nodes.forEach((n, i) => {
    if (n.depth > hideDeeperThan) return;
    hideDeeperThan = n.collapsed ? n.depth : Infinity;
    out.push(i);
  });
  return out;
}

export function outlineToScript(outline, format) {
  const blocks = [];
  outline.nodes.forEach((n, i) => {
    const text = n.text.trim();
    if (!text && !n.note?.trim()) return;
    if (format === "tv" && n.depth === 0 && /^(cold open|act|tag|teaser)/i.test(text)) {
      blocks.push(newBlock("act", text.toUpperCase()));
      if (n.note?.trim()) blocks.push(newBlock("note", n.note.trim()));
      return;
    }
    blocks.push(newBlock("note", [text, n.note?.trim()].filter(Boolean).join(" — ")));
    if (!hasKids(outline.nodes, i)) blocks.push(newBlock("action"));
  });
  const script = newScript(format, { title: outline.title, outlineId: outline.id });
  if (format === "sketch" && outline.logline) script.meta = { ...script.meta, premise: outline.logline };
  if (blocks.length) script.blocks = blocks;
  return script;
}

function outlineTxt(o) {
  const lines = [o.title.toUpperCase(), ""];
  for (const n of o.nodes) {
    if (!n.text.trim() && !n.note?.trim()) continue;
    const pad = "  ".repeat(n.depth);
    lines.push(`${pad}${n.depth === 0 ? "■" : n.depth === 1 ? "•" : "-"} ${n.text}`);
    if (n.note?.trim()) lines.push(...n.note.trim().split("\n").map(l => `${pad}    ${l}`));
  }
  download(fileName(o.title, "_outline.txt"), lines.join("\n") + "\n");
}

// ── View ────────────────────────────────────────────────────

export default function OutlineView({ outlines, scripts, activeId, onSelect, mob, onOpenScript, picking, setPicking, seed, onSeedUsed }) {
  const active = outlines.find(o => o.id === activeId);
  const add = () => setPicking(true);
  const pick = templateId => {
    setPicking(false);
    const o = create("outline", { ...outlineFromTemplate(templateId, seed?.title), logline: seed?.logline || "" });
    if (seed) onSeedUsed(o.id);
    onSelect(o.id);
  };
  const closePicker = () => { setPicking(false); if (seed) onSeedUsed(null); };
  const del = o => { if (confirm(`Delete outline “${o.title}”?`)) { remove(o.id); onSelect(null); } };
  const dup = o => onSelect(create("outline", { ...o, id: undefined, created: undefined, title: o.title + " (copy)" }).id);
  const templateName = id => TEMPLATES.find(t => t.id === id)?.name;

  return <>
    <Sidebar label="Outlines" onAdd={add} mobOpen={mob.open} onMobClose={mob.close}>
      {outlines.map(o => (
        <SbRow key={o.id} active={o.id === activeId} icon="🗂" title={o.title} onSelect={()=>onSelect(o.id)}
          onRename={t=>update(o.id,{title:t})}
          sub={[templateName(o.template), shortDate(o.updated || o.created)].filter(Boolean).join(" · ")}
          actions={<><IBtn label="dup" onClick={()=>dup(o)} /><IBtn label="del" danger onClick={()=>del(o)} /></>} />
      ))}
    </Sidebar>
    <main style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      {active
        ? <OutlineEditor key={active.id} outline={active} onUpdate={u=>update(active.id,u)}
            scripts={scripts.filter(s => s.outlineId === active.id)} onOpenScript={onOpenScript} />
        : <Empty icon="🗂" text="Outline a feature, episode, sketch or set. Start blank or from a beat sheet like Save the Cat, Story Circle or a sitcom episode." action="New Outline" onAction={add} />}
    </main>
    <MobileBar label={active?.title || "Outlines"} onOpen={mob.openIt} onAdd={add} />
    {picking && (
      <Modal title={seed ? `Outline “${seed.title}”` : "New outline"} sub="Pick a structure. You can change everything afterwards." onClose={closePicker} width={640}>
        <ChoiceGrid onPick={pick} options={TEMPLATES.map(t => ({ id: t.id, icon: FORMATS[t.format]?.icon, label: t.name, desc: t.desc }))} />
      </Modal>
    )}
  </>;
}

function OutlineEditor({ outline, onUpdate, scripts, onOpenScript }) {
  const nodes = outline.nodes?.length ? outline.nodes : [newNode()];
  const refs = useRef({});
  const [focusId, setFocusId] = useState(null);
  const [noteOpen, setNoteOpen] = useState({});
  const [toScript, setToScript] = useState(false);

  const setNodes = next => onUpdate({ nodes: next });
  const idx = id => nodes.findIndex(n => n.id === id);
  const setNode = (id, u) => setNodes(nodes.map(n => n.id === id ? { ...n, ...u } : n));
  // Focus moves right after the next render (not on a timer) so fast typing lands in the new row.
  const pendingFocus = useRef(null);
  const focus = (id, atEnd) => { pendingFocus.current = { id, atEnd }; };
  useLayoutEffect(() => {
    const p = pendingFocus.current;
    const el = p && refs.current[p.id];
    if (!el) return;
    pendingFocus.current = null;
    if (document.activeElement !== el) el.focus();
    if (p.atEnd) el.setSelectionRange(el.value.length, el.value.length);
  });

  function addAfter(id) {
    const i = idx(id), n = nodes[i];
    const intoKids = hasKids(nodes, i) && !n.collapsed;
    const at = n.collapsed ? subtreeEnd(nodes, i) : i + 1;
    const nn = newNode(intoKids ? n.depth + 1 : n.depth);
    setNodes([...nodes.slice(0, at), nn, ...nodes.slice(at)]);
    focus(nn.id);
  }
  function shift(id, dir) {
    const i = idx(id), n = nodes[i], end = subtreeEnd(nodes, i);
    if (dir > 0 && (i === 0 || nodes[i - 1].depth < n.depth)) return;
    if (dir < 0 && n.depth === 0) return;
    setNodes(nodes.map((x, j) => j >= i && j < end ? { ...x, depth: x.depth + dir } : x));
    focus(id);
  }
  function move(id, dir) {
    const i = idx(id), d = nodes[i].depth, end = subtreeEnd(nodes, i);
    if (dir < 0) {
      let p = i - 1;
      while (p >= 0 && nodes[p].depth > d) p--;
      if (p < 0 || nodes[p].depth !== d) return;
      setNodes([...nodes.slice(0, p), ...nodes.slice(i, end), ...nodes.slice(p, i), ...nodes.slice(end)]);
    } else {
      if (nodes[end]?.depth !== d) return;
      const end2 = subtreeEnd(nodes, end);
      setNodes([...nodes.slice(0, i), ...nodes.slice(end, end2), ...nodes.slice(i, end), ...nodes.slice(end2)]);
    }
    focus(id);
  }
  function del(id) {
    if (nodes.length <= 1) return setNodes([newNode()]);
    const i = idx(id), end = subtreeEnd(nodes, i);
    // Children are lifted one level rather than deleted.
    const next = [...nodes.slice(0, i), ...nodes.slice(i + 1, end).map(x => ({ ...x, depth: x.depth - 1 })), ...nodes.slice(end)];
    setNodes(next);
    const prev = next[Math.max(0, i - 1)];
    if (prev) focus(prev.id, true);
  }
  function onKeyDown(e, n) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addAfter(n.id); }
    else if (e.key === "Tab") { e.preventDefault(); shift(n.id, e.shiftKey ? -1 : 1); }
    else if (e.key === "Backspace" && n.text === "" && !n.note) { e.preventDefault(); del(n.id); }
    else if (e.altKey && e.key === "ArrowUp") { e.preventDefault(); move(n.id, -1); }
    else if (e.altKey && e.key === "ArrowDown") { e.preventDefault(); move(n.id, 1); }
  }
  const setAllCollapsed = c => setNodes(nodes.map((n, i) => hasKids(nodes, i) ? { ...n, collapsed: c } : n));

  useEffect(() => { Object.values(refs.current).forEach(el => el && autoResize(el)); }, [nodes]);

  const focused = nodes.find(n => n.id === focusId);
  const beats = nodes.filter(n => n.text.trim()).length;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"8px 16px",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0,display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
        <input value={outline.title} onChange={e=>onUpdate({title:e.target.value})} aria-label="Outline title"
          style={{background:"transparent",border:"none",outline:"none",color:T.text,fontSize:"14px",fontWeight:"600",flex:1,minWidth:"140px",caretColor:T.accent}} />
        <span style={{fontSize:"10px",color:T.textMuted,whiteSpace:"nowrap"}}>{beats} beats</span>
        <button onClick={()=>setAllCollapsed(true)} className="top-btn mob-hide" style={btn.ghost}>Collapse all</button>
        <button onClick={()=>setAllCollapsed(false)} className="top-btn mob-hide" style={btn.ghost}>Expand all</button>
        <button onClick={()=>outlineTxt(outline)} className="top-btn" style={btn.ghost}>↓ TXT</button>
        <button onClick={()=>setToScript(true)} className="top-btn" style={{...btn.ghost,color:T.accent,borderColor:T.accentDim}}>📄 → Script</button>
      </div>

      <div style={{padding:"8px 16px",background:T.surface,borderBottom:`1px solid ${T.border}`}}>
        <textarea value={outline.logline || ""} rows={1} ref={el => el && autoResize(el)}
          onChange={e=>{onUpdate({logline:e.target.value});autoResize(e.target);}}
          placeholder="Logline: the whole thing in one or two sentences…"
          style={{width:"100%",maxWidth:"720px",display:"block",margin:"0 auto",background:"transparent",border:"none",outline:"none",resize:"none",overflow:"hidden",color:T.textSec,fontSize:"12.5px",lineHeight:1.5,fontStyle:"italic",caretColor:T.accent}} />
      </div>

      {scripts.length > 0 && (
        <div style={{padding:"6px 16px",background:T.surface,borderBottom:`1px solid ${T.border}`,fontSize:"11px",color:T.textSec,display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center"}}>
          Scripts from this outline:
          {scripts.map(s => <button key={s.id} onClick={()=>onOpenScript(s.id)} style={{...btn.ghost,padding:"2px 8px",fontSize:"10.5px"}}>{FORMATS[s.format]?.icon} {s.title}</button>)}
        </div>
      )}

      {focused && (
        <FocusBar>
          <BarBtn title="Outdent (Shift+Tab)" onPress={()=>shift(focused.id,-1)}>⇤</BarBtn>
          <BarBtn title="Indent (Tab)" onPress={()=>shift(focused.id,1)}>⇥</BarBtn>
          <BarBtn title="Move up (Alt+↑)" onPress={()=>move(focused.id,-1)}>↑</BarBtn>
          <BarBtn title="Move down (Alt+↓)" onPress={()=>move(focused.id,1)}>↓</BarBtn>
          <BarBtn title="Add a note" active={!!noteOpen[focused.id]} onPress={()=>setNoteOpen(o=>({...o,[focused.id]:!o[focused.id]}))}>📝</BarBtn>
          <span style={{flex:1}} />
          <BarBtn title="New beat below (Enter)" onPress={()=>addAfter(focused.id)}>＋</BarBtn>
          <BarBtn title="Delete beat" color={T.red} onPress={()=>del(focused.id)}>🗑</BarBtn>
        </FocusBar>
      )}

      <div className="editor-pad" style={{flex:1,overflowY:"auto",padding:"24px 40px 120px",background:T.bg}}>
        <div style={{maxWidth:"720px",margin:"0 auto"}}>
          {visibleIndexes(nodes).map(i => {
            const n = nodes[i], kids = hasKids(nodes, i);
            const showNote = n.note || noteOpen[n.id] || n.hint;
            const top = n.depth === 0;
            return (
              <div key={n.id} className="node-row" style={{display:"flex",gap:"6px",paddingLeft:`${n.depth * 22}px`,marginTop:top?"14px":"2px",alignItems:"flex-start"}}>
                <button onClick={()=>kids && setNode(n.id,{collapsed:!n.collapsed})} aria-label={kids ? (n.collapsed ? "Expand" : "Collapse") : undefined}
                  style={{background:"transparent",border:"none",color:kids?T.accent:T.textMuted,cursor:kids?"pointer":"default",width:"18px",flexShrink:0,fontSize:kids?"10px":"14px",lineHeight:top?"26px":"24px",padding:0}}>
                  {kids ? (n.collapsed ? "▶" : "▼") : "•"}
                </button>
                <div style={{flex:1,minWidth:0,borderLeft:n.collapsed?`2px solid ${T.accentDim}`:"2px solid transparent",paddingLeft:"6px"}}>
                  <textarea
                    ref={el => { refs.current[n.id] = el; if (el) autoResize(el); }}
                    value={n.text} rows={1}
                    placeholder={top ? "Section / act" : "Beat"}
                    onChange={e=>{setNode(n.id,{text:e.target.value});autoResize(e.target);}}
                    onKeyDown={e=>onKeyDown(e,n)}
                    onFocus={()=>setFocusId(n.id)}
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",resize:"none",overflow:"hidden",color:top?T.accent:T.text,caretColor:T.accent,
                      fontSize:top?"15px":n.depth===1?"13.5px":"12.5px",fontWeight:top?"700":"400",lineHeight:"1.6",padding:"2px 0",letterSpacing:top?"0.02em":"0"}} />
                  {n.collapsed && <div style={{fontSize:"10px",color:T.textMuted,marginBottom:"2px"}}>{subtreeEnd(nodes, i) - i - 1} hidden</div>}
                  {showNote && (
                    <textarea
                      ref={el => el && autoResize(el)}
                      value={n.note || ""} rows={1}
                      placeholder={n.hint || "Notes, jokes, details..."}
                      onChange={e=>{setNode(n.id,{note:e.target.value});autoResize(e.target);}}
                      onFocus={()=>setFocusId(n.id)}
                      style={{width:"100%",background:"transparent",border:"none",outline:"none",resize:"none",overflow:"hidden",color:T.textSec,caretColor:T.accent,fontSize:"12px",fontStyle:n.note?"normal":"italic",lineHeight:"1.55",padding:"0 0 4px",fontFamily:T.sans}} />
                  )}
                </div>
              </div>
            );
          })}
          <button onClick={()=>{const nn=newNode(0);setNodes([...nodes,nn]);focus(nn.id);}} className="add-type"
            style={{marginTop:"24px",background:"transparent",border:`1px solid ${T.border}`,color:T.textSec,padding:"6px 12px",borderRadius:"5px",cursor:"pointer",fontSize:"11px"}}>
            + Section
          </button>
          <div className="mob-hide" style={{marginTop:"14px",fontSize:"10px",color:T.textMuted}}>
            Enter = new beat · Tab / Shift+Tab = indent · Alt+↑↓ = move with children · 📝 = notes
          </div>
        </div>
      </div>

      {toScript && (
        <Modal title="Start a script from this outline" sub="Each beat becomes a gray note in the script (notes don't print), with space to write under it." onClose={()=>setToScript(false)}>
          <ChoiceGrid onPick={f=>{ setToScript(false); onOpenScript(create("script", outlineToScript(outline, f)).id); }}
            options={Object.entries(FORMATS).map(([id, f]) => ({ id, icon: f.icon, label: f.label + (id === outline.format ? " ★" : ""), desc: f.desc }))} />
        </Modal>
      )}
    </div>
  );
}
