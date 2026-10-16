import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { T, btn, input, label } from "../theme";
import { autoResize, wc } from "../lib/util";
import { BLOCKS, FORMATS, SKETCH_FIELDS, blockStyle, exportFountain, exportTxt, looksLikeSlug, newBlock, printScript } from "../lib/formats";
import { BarBtn, FocusBar } from "./common";

export default function ScriptEditor({ script, onUpdate, outline, onOpenOutline }) {
  const { blocks } = script;
  const fmt = FORMATS[script.format] || FORMATS.film;
  const types = fmt.types;
  const meta = script.meta || {};
  const multicam = script.format === "tv" && meta.multicam;
  const refs = useRef({});
  const [focusId, setFocusId] = useState(null);
  const [showMeta, setShowMeta] = useState(script.format === "sketch" && !meta.premise && blocks.every(b => !b.text.trim()));

  const setBlocks = next => onUpdate({ blocks: next });
  const setBlock = (id, u) => setBlocks(blocks.map(b => b.id === id ? { ...b, ...u } : b));
  const setMeta = u => onUpdate({ meta: { ...meta, ...u } });
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

  function addAfter(afterId, type) {
    const idx = blocks.findIndex(b => b.id === afterId);
    const nb = newBlock(type);
    setBlocks([...blocks.slice(0, idx + 1), nb, ...blocks.slice(idx + 1)]);
    focus(nb.id);
  }
  function deleteBlock(id) {
    if (blocks.length <= 1) return;
    const idx = blocks.findIndex(b => b.id === id);
    const next = blocks.filter(b => b.id !== id);
    setBlocks(next);
    const prev = next[Math.max(0, idx - 1)];
    if (prev) focus(prev.id, true);
  }
  function cycleType(block, dir) {
    const i = Math.max(0, types.indexOf(block.type));
    setBlock(block.id, { type: types[(i + dir + types.length) % types.length] });
  }
  function onKeyDown(e, block) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Enter on an empty block cycles its type instead of piling up empties.
      if (!block.text.trim() && block.type !== "action") return setBlock(block.id, { type: "action" });
      addAfter(block.id, BLOCKS[block.type]?.next || "action");
    }
    if (e.key === "Backspace" && block.text === "") { e.preventDefault(); deleteBlock(block.id); }
    if (e.key === "Tab") { e.preventDefault(); cycleType(block, e.shiftKey ? -1 : 1); }
  }
  function onChange(block, text) {
    const u = { text };
    if (block.type === "action" && looksLikeSlug(text) && !looksLikeSlug(block.text)) u.type = "scene-heading";
    setBlock(block.id, u);
  }

  useEffect(() => { Object.values(refs.current).forEach(el => el && autoResize(el)); }, [blocks, multicam]);

  const focused = blocks.find(b => b.id === focusId);
  const words = blocks.reduce((s, b) => s + (b.type === "note" ? 0 : wc(b.text)), 0);
  const scenes = blocks.filter(b => b.type === "scene-heading" && b.text.trim()).length;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"8px 16px",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0,display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
        <span title={fmt.desc} style={{fontSize:"10px",color:T.accent,border:`1px solid ${T.accentDim}`,borderRadius:"10px",padding:"2px 8px",whiteSpace:"nowrap"}}>{fmt.icon} {fmt.label}</span>
        <input value={script.title} onChange={e=>onUpdate({title:e.target.value})} aria-label="Title"
          style={{background:"transparent",border:"none",outline:"none",color:T.text,fontSize:"14px",fontWeight:"600",flex:1,minWidth:"120px",caretColor:T.accent}} />
        <span style={{fontSize:"10px",color:T.textMuted,whiteSpace:"nowrap"}}>{scenes} sc · {words}w · ~{Math.max(1, Math.round(words / 170))}pp</span>
        {script.format !== "film" && (
          <button onClick={()=>setShowMeta(s=>!s)} className="top-btn" style={{...btn.ghost,borderColor:showMeta?T.accent:T.borderLight,color:showMeta?T.accent:T.textSec}}>
            {script.format === "sketch" ? "🧠 Sketch brain" : "📺 Episode"}
          </button>
        )}
        {outline && <button onClick={onOpenOutline} className="top-btn" style={btn.ghost} title="Open the outline this script came from">🗂 Outline</button>}
        <button onClick={()=>printScript(script)} className="top-btn" style={btn.ghost}>🖨 PDF</button>
        <button onClick={()=>exportFountain(script)} className="top-btn" style={btn.ghost} title="Fountain opens in Final Draft, Highland, WriterSolo and more">↓ Fountain</button>
        <button onClick={()=>exportTxt(script)} className="top-btn mob-hide" style={btn.ghost}>↓ TXT</button>
      </div>

      {showMeta && script.format === "tv" && (
        <div style={{padding:"12px 16px",background:T.surface,borderBottom:`1px solid ${T.border}`,display:"flex",gap:"10px",flexWrap:"wrap",alignItems:"center"}}>
          <input value={meta.show||""} onChange={e=>setMeta({show:e.target.value})} placeholder="Show name" style={{...input,flex:"1 1 160px"}} />
          <input value={meta.episode||""} onChange={e=>setMeta({episode:e.target.value})} placeholder="Episode title" style={{...input,flex:"1 1 160px"}} />
          <label style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",color:T.textSec,cursor:"pointer"}}>
            <input type="checkbox" checked={!!meta.multicam} onChange={e=>setMeta({multicam:e.target.checked})} />
            Multi-cam (caps action, double-spaced dialogue, lettered scenes)
          </label>
        </div>
      )}

      {showMeta && script.format === "sketch" && (
        <div style={{padding:"12px 16px",background:T.surface,borderBottom:`1px solid ${T.border}`,maxHeight:"45vh",overflowY:"auto"}}>
          <div style={{maxWidth:"700px",margin:"0 auto",display:"grid",gap:"10px"}}>
            {SKETCH_FIELDS.map(([k, l, ph]) => (
              <div key={k}>
                <div style={{...label,color:T.accent,marginBottom:"4px"}}>{l}</div>
                <textarea value={meta[k]||""} onChange={e=>{setMeta({[k]:e.target.value});autoResize(e.target);}} ref={autoResize}
                  placeholder={ph} rows={1}
                  style={{...input,width:"100%",resize:"none",lineHeight:1.5,fontSize:"12.5px",overflow:"hidden"}} />
              </div>
            ))}
          </div>
        </div>
      )}

      {focused && (
        <FocusBar>
          {types.map(t => (
            <BarBtn key={t} active={focused.type === t} color={BLOCKS[t].color} onPress={()=>setBlock(focused.id,{type:t})}>{BLOCKS[t].label}</BarBtn>
          ))}
          <span style={{flex:1}} />
          <BarBtn title="New block below" onPress={()=>addAfter(focused.id, BLOCKS[focused.type]?.next || "action")}>＋</BarBtn>
          <BarBtn title="Delete block" color={T.red} onPress={()=>deleteBlock(focused.id)}>🗑</BarBtn>
        </FocusBar>
      )}

      <div className="editor-pad" style={{flex:1,overflowY:"auto",padding:"32px 60px 120px",background:T.bg}}>
        <div style={{maxWidth:"660px",margin:"0 auto"}}>
          {blocks.map(block => (
            <div key={block.id} className="block-row" style={{position:"relative"}}>
              <div className="tbadge" style={{position:"absolute",left:"-72px",top:"3px",opacity:0,transition:"opacity 0.12s"}}>
                <select value={block.type} onChange={e=>setBlock(block.id,{type:e.target.value})}
                  style={{background:T.card,border:`1px solid ${T.border}`,color:BLOCKS[block.type]?.color,fontSize:"9px",borderRadius:"4px",padding:"2px 4px",cursor:"pointer",outline:"none",fontWeight:"700"}}>
                  {types.map(t => <option key={t} value={t}>{BLOCKS[t].label}</option>)}
                </select>
              </div>
              <textarea
                ref={el => { refs.current[block.id] = el; if (el) autoResize(el); }}
                value={block.text}
                onChange={e => { onChange(block, e.target.value); autoResize(e.target); }}
                onKeyDown={e => onKeyDown(e, block)}
                onFocus={() => setFocusId(block.id)}
                placeholder={BLOCKS[block.type]?.ph}
                rows={1}
                style={{...blockStyle(block.type, { multicam }),minHeight:"22px"}}
              />
            </div>
          ))}
          <div style={{marginTop:"36px",paddingTop:"20px",borderTop:`1px solid ${T.border}`,display:"flex",flexWrap:"wrap",gap:"6px"}}>
            {types.map(t => (
              <button key={t} className="add-type" onClick={()=>{const nb=newBlock(t);setBlocks([...blocks,nb]);focus(nb.id);}}
                style={{background:"transparent",border:`1px solid ${T.border}`,color:BLOCKS[t].color,padding:"5px 10px",borderRadius:"4px",cursor:"pointer",fontSize:"10px",fontWeight:"700",transition:"border-color 0.1s"}}>
                + {BLOCKS[t].label}
              </button>
            ))}
          </div>
          <div className="mob-hide" style={{marginTop:"14px",fontSize:"10px",color:T.textMuted}}>
            Enter = next block · Tab / Shift+Tab = change type · Shift+Enter = line break · type “INT.” to start a scene
          </div>
        </div>
      </div>
    </div>
  );
}
