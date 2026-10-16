import { useEffect, useState } from "react";
import { T, GLOBAL_CSS } from "./theme";
import { byNewest } from "./lib/util";
import { create, dismissNotice, getDoc, init, logout, pendingCount, update, useDocs, useStoreState } from "./lib/store";
import { newBlock, newScript } from "./lib/formats";
import Login from "./components/Login";
import IdeasView from "./components/IdeasView";
import OutlineView from "./components/OutlineView";
import ScriptsView from "./components/ScriptsView";
import StandupView, { newBit } from "./components/StandupView";
import SetsView from "./components/SetsView";
import SearchView from "./components/SearchView";

const TABS = [
  ["ideas",   "💡", "Ideas"],
  ["outline", "🗂", "Outlines"],
  ["scripts", "📄", "Scripts"],
  ["standup", "🎤", "Stand-Up"],
  ["sets",    "🎬", "Sets"],
  ["search",  "🔍", "Search"],
];
const KIND_VIEW = { idea: "ideas", outline: "outline", script: "scripts", bit: "standup", set: "sets" };

// Which tab and doc you had open is remembered per device.
const NAV_KEY = "comicdraft-nav";
const loadNav = () => { try { return JSON.parse(localStorage.getItem(NAV_KEY)) || {}; } catch { return {}; } };

init();

export default function App() {
  const { auth } = useStoreState();
  return <>
    <style>{GLOBAL_CSS}</style>
    {auth === "checking" ? <Splash /> : auth === "in" ? <Workspace /> : <Login unconfigured={auth === "unconfigured"} />}
  </>;
}

function Splash() {
  return <div style={{height:"100dvh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.mono,color:T.accent,fontSize:"14px"}}>✍ COMIC DRAFT</div>;
}

function Workspace() {
  const ideas    = useDocs("idea");
  const outlines = useDocs("outline").slice().sort(byNewest);
  const scripts  = useDocs("script").slice().sort(byNewest);
  const bits     = useDocs("bit").slice().sort(byNewest);
  const sets     = useDocs("set").slice().sort(byNewest);

  const [nav, setNav] = useState(() => ({ view: "ideas", ...loadNav() }));
  const [query, setQuery] = useState("");
  const [mobOpen, setMobOpen] = useState(false);
  const [pickScript, setPickScript] = useState(false);
  const [pickOutline, setPickOutline] = useState(false);
  const [outlineSeed, setOutlineSeed] = useState(null);

  useEffect(() => { try { localStorage.setItem(NAV_KEY, JSON.stringify(nav)); } catch { /* private mode */ } }, [nav]);

  const go = (view, patch = {}) => { setNav(n => ({ ...n, ...patch, view })); setMobOpen(false); };
  const select = key => id => { setNav(n => ({ ...n, [key]: id })); setMobOpen(false); };
  const open = (kind, id) => go(KIND_VIEW[kind], { [kind]: id });
  const mob = { open: mobOpen, close: () => setMobOpen(false), openIt: () => setMobOpen(true) };

  // Fall back to the most recent doc when nothing (or a deleted doc) is selected.
  const pick = (list, key) => (list.some(d => d.id === nav[key]) ? nav[key] : list[0]?.id || null);

  function bitToScript(bit, target) {
    const scene = [
      newBlock("scene-heading", "INT. COMEDY CLUB — NIGHT"),
      newBlock("action", bit.setup),
      newBlock("character", "COMEDIAN"),
      newBlock("dialogue", bit.punchline),
    ];
    if (target === "new") {
      const s = create("script", { ...newScript("sketch"), title: bit.title, blocks: scene });
      return open("script", s.id);
    }
    update(target, s => ({ ...s, blocks: [...s.blocks, ...scene] }));
    open("script", target);
  }

  function promoteIdea(idea, to) {
    const clean = idea.text.replace(/#[\w-]+/g, "").replace(/\s+/g, " ").trim();
    const firstLine = idea.text.split("\n")[0].replace(/#[\w-]+/g, "").trim();
    const title = (firstLine.length > 60 ? firstLine.slice(0, 60).replace(/\s+\S*$/, "") + "…" : firstLine) || "Untitled";
    if (to === "bit") {
      const b = create("bit", newBit({ title, setup: clean, tags: idea.tags || [] }));
      update(idea.id, { promoted: { kind: "bit", id: b.id } });
      return open("bit", b.id);
    }
    if (to === "sketch") {
      const base = newScript("sketch");
      const s = create("script", { ...base, title, meta: { ...base.meta, premise: clean } });
      update(idea.id, { promoted: { kind: "script", id: s.id } });
      return open("script", s.id);
    }
    setOutlineSeed({ title, logline: clean, ideaId: idea.id });
    setPickOutline(true);
    go("outline");
  }

  const onSeedUsed = outlineId => {
    if (outlineId && outlineSeed) update(outlineSeed.ideaId, { promoted: { kind: "outline", id: outlineId } });
    setOutlineSeed(null);
  };

  const v = nav.view;
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",background:T.bg,fontFamily:T.sans,color:T.text,overflow:"hidden"}}>
      <Header view={v} onView={view=>go(view)} />
      <Notice />
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {mobOpen && <div className="mob-backdrop" onClick={mob.close} style={{display:"none",position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:199}} />}
        {v === "ideas" && <IdeasView ideas={ideas} onPromote={promoteIdea} onOpen={(kind, id) => getDoc(id) ? open(kind, id) : alert("That item was deleted.")} />}
        {v === "outline" && <OutlineView outlines={outlines} scripts={scripts} activeId={pick(outlines, "outline")} onSelect={select("outline")} mob={mob}
          onOpenScript={id=>open("script", id)} picking={pickOutline} setPicking={setPickOutline} seed={outlineSeed} onSeedUsed={onSeedUsed} />}
        {v === "scripts" && <ScriptsView scripts={scripts} outlines={outlines} activeId={pick(scripts, "script")} onSelect={select("script")} mob={mob}
          onOpenOutline={id=>open("outline", id)} picking={pickScript} setPicking={setPickScript} />}
        {v === "standup" && <StandupView bits={bits} scripts={scripts} activeId={pick(bits, "bit")} onSelect={select("bit")} mob={mob} onBitToScript={bitToScript} />}
        {v === "sets" && <SetsView sets={sets} bits={bits} activeId={pick(sets, "set")} onSelect={select("set")} mob={mob} />}
        {v === "search" && <SearchView query={query} setQuery={setQuery} data={{ ideas, outlines, scripts, bits }} onOpen={open} />}
      </div>
    </div>
  );
}

const SYNC = {
  idle:    ["☁", T.textMuted, "Connecting"],
  saved:   ["✓", T.green,     "All changes saved"],
  pending: ["•", T.accent,    "Unsaved changes"],
  saving:  ["↻", T.accent,    "Saving…"],
  offline: ["⚠", T.accent,    "Offline: changes are kept on this device and sync when you reconnect"],
  error:   ["⚠", T.red,       "Sync error: will retry"],
};

function Header({ view, onView }) {
  const { sync } = useStoreState();
  const [menu, setMenu] = useState(false);
  const [icon, color, title] = SYNC[sync] || SYNC.idle;
  const signOut = async () => {
    const n = pendingCount();
    if (n && !confirm(`${n} change${n > 1 ? "s haven't" : " hasn't"} synced yet and will be lost on this device. Sign out anyway?`)) return;
    await logout();
  };
  return (
    <header style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",paddingTop:"max(8px, env(safe-area-inset-top))",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0,position:"relative"}}>
      <span style={{fontFamily:T.mono,fontSize:"13px",fontWeight:"700",color:T.accent,letterSpacing:"0.08em",whiteSpace:"nowrap"}}>✍<span className="mob-hide"> COMIC DRAFT</span></span>
      <nav style={{display:"flex",background:T.card,borderRadius:"7px",padding:"3px",border:`1px solid ${T.border}`,overflowX:"auto",minWidth:0}}>
        {TABS.map(([id, e, l]) => (
          <button key={id} onClick={()=>onView(id)} title={l}
            style={{background:view===id?T.accent:"transparent",color:view===id?T.bg:T.textSec,border:"none",cursor:"pointer",padding:"5px 9px",borderRadius:"5px",fontSize:"11px",fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.05em",display:"flex",alignItems:"center",gap:"5px",whiteSpace:"nowrap"}}>
            <span style={{fontSize:"13px"}}>{e}</span><span className="tab-label">{l}</span>
          </button>
        ))}
      </nav>
      <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}>
        <span title={title} aria-label={title} style={{color,fontSize:"13px",fontWeight:"700",minWidth:"14px",textAlign:"center"}}>{icon}</span>
        <button onClick={()=>setMenu(m=>!m)} aria-label="Menu" style={{background:"transparent",border:"none",color:T.textSec,cursor:"pointer",fontSize:"18px",lineHeight:1,padding:"0 4px"}}>⋯</button>
      </div>
      {menu && (
        <div onMouseLeave={()=>setMenu(false)} style={{position:"absolute",right:"10px",top:"100%",marginTop:"4px",background:T.card,border:`1px solid ${T.borderLight}`,borderRadius:"8px",padding:"6px",zIndex:300,minWidth:"220px",boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}}>
          <div style={{fontSize:"11px",color,padding:"6px 8px"}}>{icon} {title}</div>
          <button onClick={signOut} style={{display:"block",width:"100%",textAlign:"left",background:"transparent",border:"none",color:T.text,padding:"8px",cursor:"pointer",fontSize:"12px",borderRadius:"5px"}}>Sign out of this device</button>
        </div>
      )}
    </header>
  );
}

function Notice() {
  const { notice } = useStoreState();
  if (!notice) return null;
  return (
    <div style={{background:"#2a2410",borderBottom:`1px solid ${T.accentDim}`,padding:"8px 14px",fontSize:"12px",color:T.accent,display:"flex",gap:"10px",alignItems:"center"}}>
      <span style={{flex:1}}>{notice}</span>
      <button onClick={dismissNotice} style={{background:"transparent",border:"none",color:T.accent,cursor:"pointer",fontSize:"16px"}}>×</button>
    </div>
  );
}
