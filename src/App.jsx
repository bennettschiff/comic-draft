import { useState, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const GFONT = `@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');`;
const STORAGE_KEY = "comicdraft-v2";
const PASS_KEY    = "comicdraft-passphrase";

const SB_URL = "https://awzetqsnfetaihfkwlqx.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3emV0cXNuZmV0YWloZmt3bHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MjAxOTksImV4cCI6MjA5MjI5NjE5OX0.AfiyYEepd5-2vDTb-mZfOm68k2RxQO399gYlJLnia3A";
const SB_HDR = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

const BT  = ["scene-heading","action","character","dialogue","parenthetical","transition"];
const BL  = {"scene-heading":"SCENE","action":"ACTION","character":"CHAR","dialogue":"DIALOG","parenthetical":"PAREN","transition":"TRANS"};
const BC  = {"scene-heading":"#d4a84b","action":"#7ab87a","character":"#7ab0d4","dialogue":"#c8b0d8","parenthetical":"#8aaa7a","transition":"#d4907a"};
const BN  = {"scene-heading":"action","action":"action","character":"dialogue","dialogue":"character","parenthetical":"dialogue","transition":"scene-heading"};
const BPH = {"scene-heading":"INT. LOCATION — DAY","action":"Describe the action...","character":"CHARACTER NAME","dialogue":"What they say...","parenthetical":"beat","transition":"CUT TO:"};

const T = {
  bg:"#15130d", surface:"#1b1912", card:"#22201a", border:"#333020", borderLight:"#4a4530",
  text:"#e2d9c0", textSec:"#7a7258", textMuted:"#46432c",
  accent:"#d4a84b", accentDim:"#7a6028",
  green:"#5a9a5a", greenDim:"#2a4a2a",
  blue:"#6a9ac4", red:"#c46a6a", purple:"#a07ac4",
  mono:"'Courier Prime','Courier New',monospace",
  sans:"'DM Sans',system-ui,sans-serif",
};

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

const uid  = () => Math.random().toString(36).slice(2,9);
const wc   = s  => (s||"").trim().split(/\s+/).filter(Boolean).length;

function autoResize(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function dl(name, text) {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([text],{type:"text/plain"})),
    download: name,
  });
  a.click(); URL.revokeObjectURL(a.href);
}

const safeTime = mins => {
  const m = Math.floor(mins), s = Math.round((mins-m)*60);
  return `${m}:${String(s).padStart(2,"0")}`;
};

const estRuntime = bit => {
  if (bit.duration) return parseFloat(bit.duration);
  return Math.max(0.5, Math.round(wc((bit.setup||"")+" "+(bit.punchline||""))/100*10)/10);
};

// ═══════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) { console.warn("Save failed:", e); }
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════
// SUPABASE SYNC
// ═══════════════════════════════════════════════════════════

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sbSave(hash, data) {
  const r = await fetch(`${SB_URL}/rest/v1/user_data`, {
    method: "POST",
    headers: { ...SB_HDR, "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify({ passphrase_hash: hash, data, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(await r.text());
}

async function sbLoad(hash) {
  const r = await fetch(`${SB_URL}/rest/v1/user_data?passphrase_hash=eq.${hash}&select=data`, {
    headers: SB_HDR,
  });
  if (!r.ok) throw new Error(await r.text());
  const rows = await r.json();
  return rows[0]?.data || null;
}

// ═══════════════════════════════════════════════════════════
// FACTORIES
// ═══════════════════════════════════════════════════════════

const newBlock  = (t="action") => ({id:uid(),type:t,text:""});
const newScript = ()           => ({id:uid(),title:"Untitled Script",created:Date.now(),blocks:[newBlock("scene-heading")]});
const newBit    = ()           => ({id:uid(),title:"New Bit",setup:"",punchline:"",tags:[],notes:"",duration:null,performances:[],created:Date.now()});
const newSet    = ()           => ({id:uid(),title:"New Set",bitIds:[],created:Date.now()});
const newPerf   = ()           => ({id:uid(),date:new Date().toISOString().slice(0,10),venue:"",rating:3,notes:""});

// ═══════════════════════════════════════════════════════════
// BLOCK STYLE (screenplay formatting)
// ═══════════════════════════════════════════════════════════

function blockStyle(type) {
  const base = {fontFamily:T.mono,fontSize:"13.5px",lineHeight:"1.75",border:"none",background:"transparent",resize:"none",outline:"none",overflow:"hidden",display:"block",color:T.text,caretColor:T.accent,width:"100%",padding:"1px 0"};
  switch(type) {
    case "scene-heading": return {...base,fontWeight:"700",color:BC["scene-heading"],textTransform:"uppercase",marginTop:"28px",paddingBottom:"6px",borderBottom:`1px solid ${T.border}`};
    case "action":        return {...base,marginBottom:"2px"};
    case "character":     return {...base,marginLeft:"37%",width:"26%",textTransform:"uppercase",fontWeight:"700",color:BC["character"],marginTop:"16px"};
    case "dialogue":      return {...base,marginLeft:"20%",width:"57%"};
    case "parenthetical": return {...base,marginLeft:"28%",width:"41%",fontStyle:"italic",color:T.textSec};
    case "transition":    return {...base,textAlign:"right",textTransform:"uppercase",fontWeight:"700",color:BC["transition"],marginTop:"16px",marginBottom:"4px"};
    default:              return base;
  }
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

function exportScriptTxt(script) {
  let out = `${script.title.toUpperCase()}\n\nWritten with Comic Draft\n\n${"─".repeat(60)}\n\n`;
  for (const b of script.blocks) {
    if (!b.text.trim()) continue;
    switch(b.type) {
      case "scene-heading": out += `\n${b.text.toUpperCase()}\n\n`; break;
      case "action":        out += `${b.text}\n\n`; break;
      case "character":     out += `${"".padStart(30)}${b.text.toUpperCase()}\n`; break;
      case "dialogue":      out += `${"".padStart(20)}${b.text}\n\n`; break;
      case "parenthetical": out += `${"".padStart(25)}(${b.text})\n`; break;
      case "transition":    out += `${"".padStart(50)}${b.text.toUpperCase()}\n\n`; break;
    }
  }
  dl(script.title.replace(/\s+/g,"_")+".txt", out);
}

function printScreenplay(script) {
  const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  let body = `<div class="tp"><h1>${esc(script.title)}</h1><p>Written with Comic Draft</p></div>`;
  for (const b of script.blocks) {
    if (!b.text.trim()) continue;
    const t = esc(b.text);
    switch(b.type) {
      case "scene-heading": body+=`<p class="sh">${t}</p>`; break;
      case "action":        body+=`<p class="ac">${t}</p>`; break;
      case "character":     body+=`<p class="ch">${t}</p>`; break;
      case "dialogue":      body+=`<p class="dl">${t}</p>`; break;
      case "parenthetical": body+=`<p class="pa">(${t})</p>`; break;
      case "transition":    body+=`<p class="tr">${t}</p>`; break;
    }
  }
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(script.title)}</title><style>*{box-sizing:border-box}body{font-family:'Courier New',Courier,monospace;font-size:12pt;line-height:1.7;margin:0;padding:1in 1in 1in 1.5in}p{margin:0 0 .05em}.tp{text-align:center;margin-bottom:4em}.tp h1{font-size:14pt;text-transform:uppercase;letter-spacing:.1em}.tp p{font-style:italic;color:#666;margin-top:.5em}.sh{font-weight:bold;text-transform:uppercase;margin-top:2em;border-bottom:1px solid #000;padding-bottom:.1em;margin-bottom:.3em}.ac{margin-bottom:.8em}.ch{margin-left:2.5in;text-transform:uppercase;font-weight:bold;margin-top:1.2em;margin-bottom:.1em}.dl{margin-left:1.5in;margin-right:1.5in;margin-bottom:.8em}.pa{margin-left:2in;font-style:italic}.tr{text-align:right;text-transform:uppercase;font-weight:bold;margin-top:1.5em;margin-bottom:.5em}@page{margin:1in}@media print{body{padding:0}}</style></head><body>${body}<script>window.onload=function(){window.print()}<\/script></body></html>`;
  const win = window.open("","_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

function exportSetTxt(set, bits) {
  const sb = set.bitIds.map(id=>bits.find(b=>b.id===id)).filter(Boolean);
  const total = sb.reduce((s,b)=>s+estRuntime(b),0);
  let out = `${set.title.toUpperCase()}\nRuntime: ${safeTime(total)}\n\n${"─".repeat(50)}\n\n`;
  let running = 0;
  sb.forEach((b,i)=>{
    const rt = estRuntime(b); running+=rt;
    out+=`${i+1}. ${b.title}  (${safeTime(rt)})  →  ${safeTime(running)} running\n`;
    if (b.tags.length) out+=`   [${b.tags.join(", ")}]\n`;
    out+=`\n   SETUP:\n   ${b.setup}\n\n   PUNCHLINE:\n   ${b.punchline}\n\n${"─".repeat(50)}\n\n`;
  });
  dl(set.title.replace(/\s+/g,"_")+"_set.txt", out);
}

// ═══════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════

const SB1 = {id:uid(),title:"Airport Security",tags:["observational","travel"],duration:null,
  setup:"Going through TSA, standard routine. Guy in front of me strips down completely — shoes, belt, watch, jacket, dignity. By the time he clears the scanner he basically doesn't exist as a legal entity.",
  punchline:"The agent turns to me, looks at my flip-flops, looks back at me, and goes: 'Sir, I'm gonna need you to remove your commitment to comfort.'",
  notes:"Callback: 'commitment to comfort' can return in the airplane bit.",
  performances:[{id:uid(),date:"2024-11-12",venue:"The Laugh Factory",rating:4,notes:"Hit well on 'legal entity'. Ran a little long."}],
  created:Date.now()-86400000*3};

const SB2 = {id:uid(),title:"Self-Checkout",tags:["observational","retail"],duration:null,
  setup:"I used the self-checkout at the grocery store. Which is a job I'm now doing for free. The machine said 'unexpected item in bagging area' and I genuinely apologized to it.",
  punchline:"I said sorry. Out loud. To a scale. It did not accept my apology. It called for an attendant. She was on the machine's side.",
  notes:"Try: 'It escalated faster than most of my actual relationships.'",
  performances:[],created:Date.now()-86400000*7};

const SB3 = {id:uid(),title:"Notification Anxiety",tags:["tech","dark"],duration:null,
  setup:"I turned on Do Not Disturb for a weekend. Monday I turned it back off — 47 notifications. None of them were for me. Group chats. My friends had conversations, made dinner plans, canceled them, formed a debrief group chat.",
  punchline:"I wasn't excluded. I was simply not load-bearing.",
  notes:"'Not load-bearing' is the button. Full stop. Let it breathe.",
  performances:[
    {id:uid(),date:"2025-01-20",venue:"Brickyard Comedy",rating:5,notes:"Best closer I've had."},
    {id:uid(),date:"2025-03-08",venue:"The Punchline",rating:4,notes:"Same energy, slightly smaller pop."},
  ],created:Date.now()-86400000*14};

const SS = {id:uid(),title:"Late Night at Mel's",created:Date.now(),blocks:[
  {id:uid(),type:"scene-heading",text:"INT. COMEDY CLUB — NIGHT"},
  {id:uid(),type:"action",text:"The room smells like two-drink minimums and broken dreams. A spotlight cuts the smoke."},
  {id:uid(),type:"character",text:"COMEDIAN"},
  {id:uid(),type:"dialogue",text:"So I was going through airport security the other day..."},
  {id:uid(),type:"parenthetical",text:"beat"},
  {id:uid(),type:"dialogue",text:"And the TSA agent holds up my laptop sleeve and goes — 'Sir, are you transporting a distressed rectangle?'"},
  {id:uid(),type:"action",text:"The crowd erupts. The comedian hasn't said anything yet."},
  {id:uid(),type:"transition",text:"CUT TO:"},
  {id:uid(),type:"scene-heading",text:"INT. AIRPLANE — CONTINUOUS"},
  {id:uid(),type:"action",text:"The comedian sits in a middle seat. Both armrests occupied. He stares straight ahead with the thousand-yard look of someone who chose this."},
]};

// ═══════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════

export default function App() {
  const [view,       setView]       = useState("screenplay");
  const [scripts,    setScripts]    = useState([]);
  const [bits,       setBits]       = useState([]);
  const [sets,       setSets]       = useState([]);
  const [scriptId,   setScriptId]   = useState(null);
  const [bitId,      setBitId]      = useState(null);
  const [setId,      setSetId]      = useState(null);
  const [query,      setQuery]      = useState("");
  const [modal,      setModal]      = useState(null);
  const [loaded,     setLoaded]     = useState(false);
  const [passphrase, setPassphrase] = useState(() => localStorage.getItem(PASS_KEY) || "");
  const hashRef                     = useRef(null);
  const [syncStatus, setSyncStatus] = useState("off"); // "off"|"idle"|"syncing"|"synced"|"error"
  const syncTimer                   = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Load from localStorage + Supabase on mount
  useEffect(() => {
    async function init() {
      let cloud = null;
      const saved = localStorage.getItem(PASS_KEY);
      if (saved) {
        try {
          const h = await sha256(saved);
          hashRef.current = h;
          setSyncStatus("syncing");
          cloud = await sbLoad(h);
          setSyncStatus("idle");
        } catch { setSyncStatus("error"); }
      }
      const local = loadData();
      const d = cloud || local;
      if (d?.scripts?.length) {
        setScripts(d.scripts); setScriptId(d.scripts[0].id);
        setBits(d.bits || []); setBitId(d.bits?.[0]?.id || null);
        setSets(d.sets || []); setSetId(d.sets?.[0]?.id || null);
      } else {
        const set0 = {id:uid(),title:"Weekend Club Set",bitIds:[SB1.id,SB2.id,SB3.id],created:Date.now()};
        setScripts([SS]);       setScriptId(SS.id);
        setBits([SB1,SB2,SB3]); setBitId(SB1.id);
        setSets([set0]);        setSetId(set0.id);
      }
      setLoaded(true);
    }
    init();
  }, []);

  // Auto-save: localStorage immediately, Supabase debounced
  useEffect(() => {
    if (!loaded) return;
    saveData({ scripts, bits, sets });
    const hash = hashRef.current;
    if (!hash) return;
    clearTimeout(syncTimer.current);
    setSyncStatus("syncing");
    syncTimer.current = setTimeout(async () => {
      try {
        await sbSave(hash, { scripts, bits, sets });
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("idle"), 2000);
      } catch { setSyncStatus("error"); }
    }, 1500);
  }, [scripts, bits, sets, loaded]);

  // Close drawer on item selection
  useEffect(() => { setMobileOpen(false); }, [scriptId, bitId, setId]);

  // Connect or disconnect a passphrase
  const connectPassphrase = async (p) => {
    const trimmed = p.trim();
    if (!trimmed) {
      localStorage.removeItem(PASS_KEY);
      setPassphrase("");
      hashRef.current = null;
      setSyncStatus("off");
      return;
    }
    localStorage.setItem(PASS_KEY, trimmed);
    setPassphrase(trimmed);
    setSyncStatus("syncing");
    try {
      const h = await sha256(trimmed);
      hashRef.current = h;
      const cloud = await sbLoad(h);
      if (cloud?.scripts?.length) {
        setScripts(cloud.scripts); setScriptId(cloud.scripts[0].id);
        setBits(cloud.bits || []); setBitId(cloud.bits?.[0]?.id || null);
        setSets(cloud.sets || []); setSetId(cloud.sets?.[0]?.id || null);
      } else {
        await sbSave(h, { scripts, bits, sets });
      }
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch { setSyncStatus("error"); }
  };

  const updScript = (id,u) => setScripts(p=>p.map(s=>s.id===id?{...s,...u}:s));
  const updBit    = (id,u) => setBits(p=>p.map(b=>b.id===id?{...b,...u}:b));
  const updSet    = (id,u) => setSets(p=>p.map(s=>s.id===id?{...s,...u}:s));

  const addScript = ()  => { const s=newScript(); setScripts(p=>[...p,s]); setScriptId(s.id); setView("screenplay"); };
  const dupScript = id  => { const src=scripts.find(s=>s.id===id); if(!src)return; const s={...src,id:uid(),title:src.title+" (copy)",created:Date.now(),blocks:src.blocks.map(b=>({...b,id:uid()}))}; setScripts(p=>[...p,s]); setScriptId(s.id); };
  const delScript = id  => setScripts(p=>{ const n=p.filter(s=>s.id!==id); if(scriptId===id) setScriptId(n[0]?.id||null); return n; });

  const addBit    = ()  => { const b=newBit(); setBits(p=>[...p,b]); setBitId(b.id); setView("standup"); };
  const dupBit    = id  => { const src=bits.find(b=>b.id===id); if(!src)return; const b={...src,id:uid(),title:src.title+" (copy)",created:Date.now(),performances:[]}; setBits(p=>[...p,b]); setBitId(b.id); };
  const delBit    = id  => setBits(p=>{ const n=p.filter(b=>b.id!==id); if(bitId===id) setBitId(n[0]?.id||null); return n; });

  const addSet    = ()  => { const s=newSet(); setSets(p=>[...p,s]); setSetId(s.id); setView("sets"); };
  const delSet    = id  => setSets(p=>{ const n=p.filter(s=>s.id!==id); if(setId===id) setSetId(n[0]?.id||null); return n; });

  const bitToScript = (bit,sid) => {
    const target=scripts.find(s=>s.id===sid); if(!target)return;
    const additions=[
      {id:uid(),type:"scene-heading",text:"INT. COMEDY CLUB — NIGHT"},
      {id:uid(),type:"action",text:bit.setup},
      {id:uid(),type:"character",text:"COMEDIAN"},
      {id:uid(),type:"dialogue",text:bit.punchline},
    ];
    updScript(sid,{blocks:[...target.blocks,...additions]});
    setScriptId(sid); setView("screenplay"); setModal(null);
  };

  const activeScript = scripts.find(s=>s.id===scriptId);
  const activeBit    = bits.find(b=>b.id===bitId);
  const activeSet    = sets.find(s=>s.id===setId);
  const allTags      = [...new Set(bits.flatMap(b=>b.tags))];

  if (!loaded) return (
    <div style={{height:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.sans,color:T.accent,fontSize:"14px"}}>
      Loading Comic Draft…
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",background:T.bg,fontFamily:T.sans,color:T.text,overflow:"hidden"}}>
      <style>{`
        ${GFONT}
        *{box-sizing:border-box;margin:0;padding:0}
        ::selection{background:${T.accentDim};color:${T.text}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:${T.bg}}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
        textarea,input,select{font-family:inherit}
        textarea::placeholder,input::placeholder{color:${T.textMuted}}
        .sb-row:hover{background:${T.card}!important}
        .block-row:hover .tbadge{opacity:1!important}
        .iab:hover{color:${T.accent}!important}
        .iab-rd:hover{color:${T.red}!important}
        .add-type:hover{border-color:${T.accent}!important}
        .avail-card:hover{border-color:${T.accent}!important}
        .result-card:hover{border-color:${T.accent}!important}
        .top-btn:hover{border-color:${T.accent}!important;color:${T.accent}!important}
        @media (max-width: 600px) {
          .sidebar {
            position: fixed !important;
            top: 0 !important; bottom: 0 !important; left: 0 !important;
            width: 82vw !important; max-width: 300px !important;
            z-index: 200 !important;
            transform: translateX(-105%);
            transition: transform 0.22s ease;
          }
          .sidebar.mob-open {
            transform: translateX(0) !important;
            box-shadow: 6px 0 28px rgba(0,0,0,0.65);
          }
          .mob-hide { display: none !important; }
          .mob-bar { display: flex !important; }
          .mob-close { display: flex !important; }
          .mob-backdrop { display: block !important; }
          main { padding-bottom: 60px !important; }
        }
      `}</style>

      <AppHeader view={view} setView={setView} query={query} setQuery={setQuery}
        onNewScript={addScript} onNewBit={addBit} onNewSet={addSet}
        passphrase={passphrase} syncStatus={syncStatus} onConnect={connectPassphrase} />

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {mobileOpen && (
          <div className="mob-backdrop" onClick={()=>setMobileOpen(false)}
            style={{display:"none",position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:199}} />
        )}

        {view==="screenplay" && <>
          <ScreenplaySidebar scripts={scripts} activeId={scriptId} onSelect={setScriptId}
            onAdd={addScript} onDup={dupScript} onDel={delScript}
            onRename={(id,t)=>updScript(id,{title:t})}
            onExport={s=>exportScriptTxt(s)} onPrint={s=>printScreenplay(s)}
            mobOpen={mobileOpen} onMobClose={()=>setMobileOpen(false)} />
          <main style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
            {activeScript
              ? <ScreenplayEditor script={activeScript}
                  onUpdateBlocks={blocks=>updScript(activeScript.id,{blocks})}
                  onRename={t=>updScript(activeScript.id,{title:t})}
                  onPrint={()=>printScreenplay(activeScript)}
                  onExport={()=>exportScriptTxt(activeScript)} />
              : <Empty label="screenplay" onAdd={addScript} />}
          </main>
          <MobileBar label={activeScript?.title||"Scripts"} onOpen={()=>setMobileOpen(true)} onAdd={addScript} />
        </>}

        {view==="standup" && <>
          <StandupSidebar bits={bits} activeId={bitId} onSelect={setBitId}
            onAdd={addBit} onDup={dupBit} onDel={delBit} allTags={allTags}
            mobOpen={mobileOpen} onMobClose={()=>setMobileOpen(false)} />
          <main style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
            {activeBit
              ? <BitEditor bit={activeBit} onUpdate={u=>updBit(activeBit.id,u)}
                  scripts={scripts} onBitToScript={bitToScript}
                  onShowPerf={()=>setModal({type:"perf",bitId:activeBit.id})} />
              : <Empty label="bit" onAdd={addBit} />}
          </main>
          <MobileBar label={activeBit?.title||"Bits"} onOpen={()=>setMobileOpen(true)} onAdd={addBit} />
        </>}

        {view==="sets" && <>
          <SetSidebar sets={sets} activeId={setId} onSelect={setSetId}
            onAdd={addSet} onDel={delSet}
            onRename={(id,t)=>updSet(id,{title:t})}
            mobOpen={mobileOpen} onMobClose={()=>setMobileOpen(false)} />
          <main style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
            {activeSet
              ? <SetEditor set={activeSet} bits={bits}
                  onUpdate={u=>updSet(activeSet.id,u)}
                  onExport={()=>exportSetTxt(activeSet,bits)} />
              : <Empty label="set" onAdd={addSet} />}
          </main>
          <MobileBar label={activeSet?.title||"Sets"} onOpen={()=>setMobileOpen(true)} onAdd={addSet} />
        </>}

        {view==="search" && (
          <SearchView query={query} setQuery={setQuery} scripts={scripts} bits={bits}
            onOpenScript={id=>{setScriptId(id);setView("screenplay");}}
            onOpenBit={id=>{setBitId(id);setView("standup");}} />
        )}
      </div>

      {modal?.type==="perf" && (
        <PerfModal
          bit={bits.find(b=>b.id===modal.bitId)}
          onUpdate={u=>updBit(modal.bitId,u)}
          onClose={()=>setModal(null)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════════

function AppHeader({view,setView,query,setQuery,onNewScript,onNewBit,onNewSet,passphrase,syncStatus,onConnect}) {
  const [showSync, setShowSync] = useState(false);
  const [input,    setInput]    = useState(passphrase||"");
  const tabs=[["screenplay","📽","Screenplay"],["standup","🎤","Stand-Up"],["sets","🎬","Sets"],["search","🔍","Search"]];

  const syncLabel = { off:"☁ Sync", idle:"☁ Synced", syncing:"↻ Sync…", synced:"✓ Synced", error:"⚠ Sync" };
  const syncColor = { off:T.textMuted, idle:T.textSec, syncing:T.accent, synced:T.green, error:T.red };

  return (
    <>
    <header style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 16px",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0,flexWrap:"wrap"}}>
      <span style={{fontFamily:T.mono,fontSize:"13px",fontWeight:"700",color:T.accent,letterSpacing:"0.08em",whiteSpace:"nowrap"}}>✍ COMIC DRAFT</span>
      <div style={{display:"flex",background:T.card,borderRadius:"7px",padding:"3px",border:`1px solid ${T.border}`,flexShrink:0}}>
        {tabs.map(([v,e,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{
            background:view===v?T.accent:"transparent",color:view===v?T.bg:T.textSec,
            border:"none",cursor:"pointer",padding:"4px 10px",borderRadius:"5px",
            fontSize:"11px",fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.05em",
            display:"flex",alignItems:"center",gap:"4px",transition:"all 0.15s",whiteSpace:"nowrap",
          }}>{e} <span style={{display:"none"}} className="tab-label">{l}</span></button>
        ))}
      </div>
      {view==="search" && (
        <input value={query} onChange={e=>setQuery(e.target.value)}
          placeholder="Search scripts and bits..." autoFocus
          style={{flex:1,minWidth:"140px",maxWidth:"320px",background:T.card,border:`1px solid ${T.border}`,color:T.text,padding:"5px 10px",borderRadius:"6px",fontSize:"12px",outline:"none",caretColor:T.accent}}
        />
      )}
      <div style={{marginLeft:"auto",display:"flex",gap:"5px",flexShrink:0,alignItems:"center"}}>
        <div className="mob-hide" style={{display:"flex",gap:"5px"}}>
          {[["+ Script",onNewScript],["+ Bit",onNewBit],["+ Set",onNewSet]].map(([l,fn])=>(
            <button key={l} onClick={fn} className="top-btn" style={{background:"transparent",border:`1px solid ${T.borderLight}`,color:T.textSec,padding:"4px 9px",borderRadius:"5px",cursor:"pointer",fontSize:"10px",fontWeight:"500",fontFamily:"inherit",transition:"all 0.12s"}}>{l}</button>
          ))}
        </div>
        <button onClick={()=>{setInput(passphrase||"");setShowSync(s=>!s);}} className="top-btn"
          style={{background:"transparent",border:`1px solid ${T.borderLight}`,color:syncColor[syncStatus]||T.textSec,padding:"4px 9px",borderRadius:"5px",cursor:"pointer",fontSize:"10px",fontWeight:"600",fontFamily:"inherit",transition:"all 0.12s",whiteSpace:"nowrap"}}>
          {syncLabel[syncStatus]||"☁ Sync"}
        </button>
      </div>
    </header>

    {showSync && (
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
        <span style={{fontSize:"11px",color:T.textSec,whiteSpace:"nowrap"}}>Sync passphrase — use the same phrase on every device:</span>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"){onConnect(input);setShowSync(false);} if(e.key==="Escape")setShowSync(false); }}
          placeholder="e.g. purple-microphone-7"
          style={{flex:1,minWidth:"180px",maxWidth:"280px",background:T.card,border:`1px solid ${T.borderLight}`,color:T.text,padding:"6px 10px",borderRadius:"6px",fontSize:"12px",outline:"none",caretColor:T.accent,fontFamily:"inherit"}}
        />
        <button onClick={()=>{onConnect(input);setShowSync(false);}}
          style={{background:T.accent,border:"none",color:T.bg,padding:"6px 14px",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontWeight:"600",fontFamily:"inherit",whiteSpace:"nowrap"}}>
          {passphrase?"Update":"Connect"}
        </button>
        {passphrase && (
          <button onClick={()=>{onConnect("");setShowSync(false);}}
            style={{background:"transparent",border:`1px solid ${T.red}`,color:T.red,padding:"6px 14px",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit",whiteSpace:"nowrap"}}>
            Disconnect
          </button>
        )}
        <button onClick={()=>setShowSync(false)}
          style={{background:"transparent",border:"none",color:T.textMuted,cursor:"pointer",fontSize:"18px",lineHeight:1,fontFamily:"inherit",padding:"0 4px"}}>×</button>
      </div>
    )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// SHARED SIDEBAR PIECES
// ═══════════════════════════════════════════════════════════

function SbHeader({label,onAdd,onClose}) {
  return (
    <div style={{padding:"11px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
      <span style={{fontSize:"10px",fontWeight:"600",letterSpacing:"0.1em",color:T.textMuted,textTransform:"uppercase"}}>{label}</span>
      <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
        <button className="mob-close" onClick={onClose}
          style={{display:"none",background:"transparent",border:"none",color:T.textMuted,cursor:"pointer",fontSize:"20px",lineHeight:1,fontFamily:"inherit",padding:"0 2px"}}>
          ×
        </button>
        <button onClick={onAdd} style={{background:"transparent",border:`1px solid ${T.borderLight}`,color:T.accent,width:"20px",height:"20px",borderRadius:"4px",cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,fontFamily:"inherit"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
          onMouseLeave={e=>e.currentTarget.style.borderColor=T.borderLight}
        >+</button>
      </div>
    </div>
  );
}

function IBtn({onClick,label,danger=false}) {
  return (
    <button className={danger?"iab iab-rd":"iab"} onClick={onClick}
      style={{background:"transparent",border:"none",cursor:"pointer",color:T.textMuted,fontSize:"10px",fontWeight:"600",padding:"2px 6px",borderRadius:"3px",fontFamily:"inherit",transition:"color 0.1s"}}>
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREENPLAY SIDEBAR
// ═══════════════════════════════════════════════════════════

function ScreenplaySidebar({scripts,activeId,onSelect,onAdd,onDup,onDel,onRename,onExport,onPrint,mobOpen,onMobClose}) {
  const [editing,setEditing]=useState(null);
  const [val,setVal]=useState("");
  const commit=(id,fb)=>{onRename(id,val.trim()||fb);setEditing(null);};
  return (
    <aside className={`sidebar${mobOpen?" mob-open":""}`} style={{width:"200px",background:T.surface,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
      <SbHeader label="Scripts" onAdd={onAdd} onClose={onMobClose} />
      <div style={{flex:1,overflowY:"auto",padding:"6px"}}>
        {scripts.map(s=>(
          <div key={s.id} className="sb-row" onClick={()=>onSelect(s.id)} style={{padding:"8px 10px",borderRadius:"6px",cursor:"pointer",marginBottom:"2px",background:activeId===s.id?T.card:"transparent",border:`1px solid ${activeId===s.id?T.border:"transparent"}`}}>
            {editing===s.id
              ? <input autoFocus value={val} onChange={e=>setVal(e.target.value)}
                  onBlur={()=>commit(s.id,s.title)}
                  onKeyDown={e=>{if(e.key==="Enter")commit(s.id,s.title);if(e.key==="Escape")setEditing(null);}}
                  onClick={e=>e.stopPropagation()}
                  style={{background:"transparent",border:"none",outline:"none",color:T.text,fontSize:"12px",width:"100%",caretColor:T.accent}}
                />
              : <span onDoubleClick={()=>{setEditing(s.id);setVal(s.title);}}
                  style={{fontSize:"12px",color:activeId===s.id?T.text:T.textSec,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  📄 {s.title}
                </span>
            }
            {activeId===s.id && editing!==s.id && (
              <div style={{display:"flex",gap:"2px",marginTop:"5px",flexWrap:"wrap"}}>
                <IBtn label="🖨 print" onClick={e=>{e.stopPropagation();onPrint(s);}} />
                <IBtn label="↓ txt"   onClick={e=>{e.stopPropagation();onExport(s);}} />
                <IBtn label="dup"     onClick={e=>{e.stopPropagation();onDup(s.id);}} />
                {scripts.length>1 && <IBtn label="del" onClick={e=>{e.stopPropagation();onDel(s.id);}} danger />}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`,fontSize:"10px",color:T.textMuted}}>Double-click to rename</div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREENPLAY EDITOR
// ═══════════════════════════════════════════════════════════

function ScreenplayEditor({script,onUpdateBlocks,onRename,onPrint,onExport}) {
  const {blocks}=script;
  const refs=useRef({});
  const setBlock=(id,u)=>onUpdateBlocks(blocks.map(b=>b.id===id?{...b,...u}:b));
  function addAfter(afterId,type="action"){const idx=blocks.findIndex(b=>b.id===afterId);const nb=newBlock(type);onUpdateBlocks([...blocks.slice(0,idx+1),nb,...blocks.slice(idx+1)]);setTimeout(()=>refs.current[nb.id]?.focus(),20);}
  function deleteBlock(id){if(blocks.length<=1)return;const idx=blocks.findIndex(b=>b.id===id);const next=blocks.filter(b=>b.id!==id);onUpdateBlocks(next);const prevId=next[Math.max(0,idx-1)]?.id;if(prevId)setTimeout(()=>{const el=refs.current[prevId];if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}},20);}
  function handleKeyDown(e,block){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addAfter(block.id,BN[block.type]||"action");}if(e.key==="Backspace"&&block.text===""){e.preventDefault();deleteBlock(block.id);}if(e.key==="Tab"){e.preventDefault();const i=BT.indexOf(block.type);setBlock(block.id,{type:BT[(i+(e.shiftKey?BT.length-1:1))%BT.length]});}}
  useEffect(()=>{Object.values(refs.current).forEach(el=>{if(el)autoResize(el);});},[blocks]);
  const totalWords=blocks.reduce((s,b)=>s+wc(b.text),0);
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"8px 20px",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0,display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
        <input value={script.title} onChange={e=>onRename(e.target.value)}
          style={{background:"transparent",border:"none",outline:"none",color:T.text,fontSize:"13px",fontWeight:"500",flex:1,minWidth:"120px",caretColor:T.accent}}
        />
        <span style={{fontSize:"10px",color:T.textMuted,whiteSpace:"nowrap"}}>{blocks.length} el · {totalWords}w</span>
        <button onClick={onPrint} className="top-btn" style={{background:"transparent",border:`1px solid ${T.borderLight}`,color:T.textSec,padding:"4px 10px",borderRadius:"5px",cursor:"pointer",fontSize:"10px",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all 0.12s"}}>🖨 Print/PDF</button>
        <button onClick={onExport} className="top-btn" style={{background:"transparent",border:`1px solid ${T.borderLight}`,color:T.textSec,padding:"4px 10px",borderRadius:"5px",cursor:"pointer",fontSize:"10px",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all 0.12s"}}>↓ TXT</button>
      </div>
      <div style={{padding:"3px 20px",background:T.surface,borderBottom:`1px solid ${T.border}`,flexShrink:0,fontSize:"9px",color:T.textMuted}}>
        Enter = next block · Tab = cycle type · Shift+Enter = line break · Hover for type selector
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"40px 60px 100px",background:T.bg}}>
        <div style={{maxWidth:"660px",margin:"0 auto"}}>
          {blocks.map(block=>(
            <div key={block.id} className="block-row" style={{position:"relative"}}>
              <div className="tbadge" style={{position:"absolute",left:"-72px",top:"3px",opacity:0,transition:"opacity 0.12s"}}>
                <select value={block.type} onChange={e=>setBlock(block.id,{type:e.target.value})} onClick={e=>e.stopPropagation()}
                  style={{background:T.card,border:`1px solid ${T.border}`,color:BC[block.type],fontSize:"9px",borderRadius:"4px",padding:"2px 4px",cursor:"pointer",outline:"none",fontWeight:"700"}}>
                  {BT.map(t=><option key={t} value={t}>{BL[t]}</option>)}
                </select>
              </div>
              <textarea
                ref={el=>{refs.current[block.id]=el;if(el)autoResize(el);}}
                value={block.text}
                onChange={e=>{setBlock(block.id,{text:e.target.value});autoResize(e.target);}}
                onKeyDown={e=>handleKeyDown(e,block)}
                placeholder={BPH[block.type]}
                rows={1}
                style={{...blockStyle(block.type),minHeight:"22px"}}
              />
            </div>
          ))}
          <div style={{marginTop:"36px",paddingTop:"24px",borderTop:`1px solid ${T.border}`,display:"flex",flexWrap:"wrap",gap:"6px"}}>
            {BT.map(t=>(
              <button key={t} className="add-type" onClick={()=>{const nb=newBlock(t);onUpdateBlocks([...blocks,nb]);setTimeout(()=>refs.current[nb.id]?.focus(),20);}}
                style={{background:"transparent",border:`1px solid ${T.border}`,color:BC[t],padding:"4px 10px",borderRadius:"4px",cursor:"pointer",fontSize:"10px",fontWeight:"700",transition:"border-color 0.1s",fontFamily:"inherit"}}>
                + {BL[t]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STANDUP SIDEBAR
// ═══════════════════════════════════════════════════════════

function StandupSidebar({bits,activeId,onSelect,onAdd,onDup,onDel,allTags,mobOpen,onMobClose}) {
  const [tagFilter,setTagFilter]=useState(null);
  const filtered=tagFilter?bits.filter(b=>b.tags.includes(tagFilter)):bits;
  return (
    <aside className={`sidebar${mobOpen?" mob-open":""}`} style={{width:"200px",background:T.surface,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
      <SbHeader label="Bits" onAdd={onAdd} onClose={onMobClose} />
      {allTags.length>0 && (
        <div style={{padding:"8px 10px",borderBottom:`1px solid ${T.border}`,display:"flex",flexWrap:"wrap",gap:"4px"}}>
          {allTags.map(t=>(
            <span key={t} onClick={()=>setTagFilter(tagFilter===t?null:t)}
              style={{padding:"2px 7px",borderRadius:"10px",fontSize:"10px",cursor:"pointer",userSelect:"none",background:tagFilter===t?T.accent:T.card,color:tagFilter===t?T.bg:T.textSec,border:`1px solid ${tagFilter===t?T.accent:T.border}`,transition:"all 0.12s"}}>
              {t}
            </span>
          ))}
        </div>
      )}
      <div style={{flex:1,overflowY:"auto",padding:"6px"}}>
        {filtered.map(b=>(
          <div key={b.id} className="sb-row" onClick={()=>onSelect(b.id)} style={{padding:"8px 10px",borderRadius:"6px",cursor:"pointer",marginBottom:"2px",background:activeId===b.id?T.card:"transparent",border:`1px solid ${activeId===b.id?T.border:"transparent"}`}}>
            <div style={{fontSize:"12px",color:activeId===b.id?T.text:T.textSec,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🎤 {b.title}</div>
            {b.tags.length>0 && (
              <div style={{display:"flex",gap:"3px",marginTop:"4px",flexWrap:"wrap"}}>
                {b.tags.slice(0,3).map(t=><span key={t} style={{fontSize:"9px",background:T.bg,color:T.textMuted,padding:"1px 5px",borderRadius:"8px",border:`1px solid ${T.border}`}}>{t}</span>)}
              </div>
            )}
            {activeId===b.id && (
              <div style={{display:"flex",gap:"2px",marginTop:"5px"}}>
                <IBtn label="dup" onClick={e=>{e.stopPropagation();onDup(b.id);}} />
                {bits.length>1 && <IBtn label="del" onClick={e=>{e.stopPropagation();onDel(b.id);}} danger />}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{padding:"8px 14px",borderTop:`1px solid ${T.border}`,fontSize:"10px",color:T.textMuted}}>
        {bits.length} bit{bits.length!==1?"s":""} · {bits.reduce((s,b)=>s+estRuntime(b),0).toFixed(1)} min total
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════
// BIT EDITOR
// ═══════════════════════════════════════════════════════════

function BitEditor({bit,onUpdate,scripts,onBitToScript,onShowPerf}) {
  const [tagInput,    setTagInput]    = useState("");
  const [showBridge,  setShowBridge]  = useState(false);
  const [bridgeScript,setBridgeScript]= useState(scripts[0]?.id||"");

  const addTag = raw => {
    const t = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g,"");
    if (t && !bit.tags.includes(t)) onUpdate({tags:[...bit.tags,t]});
    setTagInput("");
  };

  const taBase = {width:"100%",background:T.card,border:`1px solid ${T.border}`,borderRadius:"8px",color:T.text,padding:"14px 16px",fontSize:"13.5px",fontFamily:T.mono,lineHeight:"1.8",resize:"none",outline:"none",caretColor:T.accent,transition:"border-color 0.15s"};
  const Label = ({e,l,color,sub}) => (
    <div style={{fontSize:"10px",fontWeight:"600",letterSpacing:"0.1em",color,textTransform:"uppercase",display:"flex",alignItems:"center",gap:"6px",marginBottom:"9px"}}>
      <span style={{fontSize:"13px"}}>{e}</span><span>{l}</span>
      {sub && <span style={{fontWeight:"400",color:T.textMuted,marginLeft:"4px",fontSize:"9px",textTransform:"none"}}>{sub}</span>}
    </div>
  );

  const avgRating = bit.performances.length
    ? (bit.performances.reduce((s,p)=>s+p.rating,0)/bit.performances.length).toFixed(1)
    : null;

  return (
    <div style={{flex:1,overflowY:"auto",padding:"28px 36px 80px",background:T.bg}}>
      <div style={{maxWidth:"660px",margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:"12px",marginBottom:"24px",flexWrap:"wrap"}}>
          <input value={bit.title} onChange={e=>onUpdate({title:e.target.value})} placeholder="Bit title..."
            style={{flex:1,minWidth:"160px",background:"transparent",border:"none",borderBottom:`2px solid ${T.accent}`,outline:"none",color:T.text,fontSize:"20px",fontWeight:"600",paddingBottom:"8px",caretColor:T.accent}}
          />
          <div style={{display:"flex",gap:"6px",flexShrink:0,paddingBottom:"10px"}}>
            <button onClick={onShowPerf} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.textSec,padding:"5px 10px",borderRadius:"5px",cursor:"pointer",fontSize:"11px",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"4px",whiteSpace:"nowrap"}}>
              🎭 Log {avgRating&&<span style={{color:T.accent}}>★{avgRating}</span>}
            </button>
            <button onClick={()=>setShowBridge(s=>!s)} style={{background:"transparent",border:`1px solid ${showBridge?T.blue:T.border}`,color:showBridge?T.blue:T.textSec,padding:"5px 10px",borderRadius:"5px",cursor:"pointer",fontSize:"11px",fontFamily:"inherit",whiteSpace:"nowrap"}}>
              📽 → Script
            </button>
          </div>
        </div>

        {showBridge && scripts.length>0 && (
          <div style={{background:T.card,border:`1px solid ${T.blue}`,borderRadius:"8px",padding:"14px 16px",marginBottom:"24px"}}>
            <div style={{fontSize:"11px",color:T.blue,fontWeight:"600",marginBottom:"10px",letterSpacing:"0.05em",textTransform:"uppercase"}}>📽 Send bit to screenplay as scene</div>
            <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
              <select value={bridgeScript} onChange={e=>setBridgeScript(e.target.value)}
                style={{flex:1,background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:"6px 10px",borderRadius:"5px",fontSize:"12px",outline:"none"}}>
                {scripts.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              <button onClick={()=>onBitToScript(bit,bridgeScript)}
                style={{background:T.blue,border:"none",color:"#fff",padding:"7px 14px",borderRadius:"5px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit",fontWeight:"600"}}>
                Add as Scene
              </button>
            </div>
          </div>
        )}

        <div style={{marginBottom:"22px"}}>
          <Label e="🏷" l="Tags" color={T.textSec} />
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px",alignItems:"center",background:T.card,border:`1px solid ${T.border}`,borderRadius:"8px",padding:"10px 13px",minHeight:"44px"}}>
            {bit.tags.map(t=>(
              <span key={t} style={{padding:"3px 10px",borderRadius:"12px",background:T.bg,border:`1px solid ${T.borderLight}`,color:T.accent,fontSize:"11px",display:"flex",alignItems:"center",gap:"5px"}}>
                {t}<span onClick={()=>onUpdate({tags:bit.tags.filter(x=>x!==t)})} style={{cursor:"pointer",color:T.textMuted,fontSize:"14px",lineHeight:1}}>×</span>
              </span>
            ))}
            <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"||e.key===","){e.preventDefault();addTag(tagInput);}if(e.key==="Backspace"&&tagInput===""&&bit.tags.length>0)onUpdate({tags:bit.tags.slice(0,-1)});}}
              placeholder={bit.tags.length===0?"observational, travel, dark...":"add tag..."}
              style={{background:"transparent",border:"none",outline:"none",color:T.text,fontSize:"11px",minWidth:"100px",caretColor:T.accent}}
            />
          </div>
        </div>

        <div style={{marginBottom:"22px",display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
          <Label e="⏱" l="Stage time" color={T.textSec} />
          <input type="number" step="0.5" min="0.5" max="60"
            value={bit.duration||""} onChange={e=>onUpdate({duration:e.target.value?parseFloat(e.target.value):null})}
            placeholder={`~${estRuntime(bit)} min (auto)`}
            style={{width:"130px",background:T.card,border:`1px solid ${T.border}`,borderRadius:"6px",color:T.text,padding:"5px 10px",fontSize:"12px",outline:"none"}}
          />
          <span style={{fontSize:"10px",color:T.textMuted}}>min override</span>
        </div>

        <div style={{marginBottom:"22px"}}>
          <Label e="🎯" l="Setup" color={T.green} sub={`${wc(bit.setup)} words`} />
          <textarea value={bit.setup} onChange={e=>onUpdate({setup:e.target.value})}
            placeholder={"Set the scene. Ground the audience in a recognizable reality."}
            rows={5} style={{...taBase,borderColor:T.greenDim}}
            onFocus={e=>e.target.style.borderColor="#4a8a4a"}
            onBlur={e=>e.target.style.borderColor=T.greenDim}
          />
        </div>

        <div style={{marginBottom:"22px"}}>
          <Label e="💥" l="Punchline / Tag" color={T.accent} sub={`${wc(bit.punchline)} words`} />
          <textarea value={bit.punchline} onChange={e=>onUpdate({punchline:e.target.value})}
            placeholder={"The subversion. The misdirect. The reveal."}
            rows={5} style={{...taBase,borderColor:"#4a3a12"}}
            onFocus={e=>e.target.style.borderColor="#8a6a28"}
            onBlur={e=>e.target.style.borderColor="#4a3a12"}
          />
        </div>

        <div style={{marginBottom:"28px"}}>
          <Label e="📝" l="Notes / Callbacks / Alt angles" color={T.textSec} />
          <textarea value={bit.notes} onChange={e=>onUpdate({notes:e.target.value})}
            placeholder={"Alt takes, callbacks, crowd work cues, mileage notes..."}
            rows={3} style={taBase}
            onFocus={e=>e.target.style.borderColor=T.borderLight}
            onBlur={e=>e.target.style.borderColor=T.border}
          />
        </div>

        <div style={{display:"flex",gap:"16px",fontSize:"10px",color:T.textMuted,paddingTop:"6px",borderTop:`1px solid ${T.border}`,flexWrap:"wrap"}}>
          <span>Setup {wc(bit.setup)}w</span>
          <span>Punchline {wc(bit.punchline)}w</span>
          <span>~{estRuntime(bit)} min</span>
          <span>{bit.performances.length} performance{bit.performances.length!==1?"s":""}</span>
          {bit.created&&<span style={{marginLeft:"auto"}}>Created {new Date(bit.created).toLocaleDateString()}</span>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PERFORMANCE MODAL
// ═══════════════════════════════════════════════════════════

function PerfModal({bit,onUpdate,onClose}) {
  const [form,  setForm]  = useState(newPerf());
  const [adding,setAdding]= useState(false);
  if (!bit) return null;
  const addPerf = () => { onUpdate({performances:[...bit.performances,{...form}]}); setForm(newPerf()); setAdding(false); };
  const delPerf = id => onUpdate({performances:bit.performances.filter(p=>p.id!==id)});
  const avgRating = bit.performances.length ? (bit.performances.reduce((s,p)=>s+p.rating,0)/bit.performances.length).toFixed(1) : null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"16px"}} onClick={onClose}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:"12px",width:"100%",maxWidth:"500px",maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontSize:"13px",fontWeight:"600",color:T.text}}>🎭 Performance Log</div>
            <div style={{fontSize:"11px",color:T.textSec,marginTop:"2px"}}>{bit.title}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            {avgRating&&<span style={{fontSize:"13px",color:T.accent}}>★ {avgRating} avg ({bit.performances.length})</span>}
            <button onClick={onClose} style={{background:"transparent",border:"none",color:T.textSec,cursor:"pointer",fontSize:"22px",lineHeight:1,fontFamily:"inherit"}}>×</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"10px 18px"}}>
          {bit.performances.length===0&&!adding&&(
            <div style={{textAlign:"center",padding:"28px",color:T.textMuted,fontSize:"12px"}}>No performances logged yet</div>
          )}
          {[...bit.performances].reverse().map(p=>(
            <div key={p.id} style={{padding:"10px 12px",background:T.card,border:`1px solid ${T.border}`,borderRadius:"8px",marginBottom:"7px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <span style={{fontSize:"12px",fontWeight:"600",color:T.text}}>{p.venue||"Unnamed venue"}</span>
                  <span style={{fontSize:"11px",color:T.textSec}}>{p.date}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                  <span style={{fontSize:"12px",color:T.accent}}>{"★".repeat(p.rating)}{"☆".repeat(5-p.rating)}</span>
                  <button onClick={()=>delPerf(p.id)} style={{background:"transparent",border:"none",color:T.textMuted,cursor:"pointer",fontSize:"15px",lineHeight:1,fontFamily:"inherit"}}
                    onMouseEnter={e=>e.currentTarget.style.color=T.red}
                    onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}
                  >×</button>
                </div>
              </div>
              {p.notes&&<div style={{fontSize:"11px",color:T.textSec,fontStyle:"italic",lineHeight:"1.5"}}>{p.notes}</div>}
            </div>
          ))}
          {adding&&(
            <div style={{padding:"12px",background:T.card,border:`1px solid ${T.borderLight}`,borderRadius:"8px",marginBottom:"8px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
                <div>
                  <div style={{fontSize:"10px",color:T.textMuted,marginBottom:"4px",textTransform:"uppercase"}}>Date</div>
                  <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                    style={{width:"100%",background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:"6px 8px",borderRadius:"5px",fontSize:"12px",outline:"none"}} />
                </div>
                <div>
                  <div style={{fontSize:"10px",color:T.textMuted,marginBottom:"4px",textTransform:"uppercase"}}>Venue</div>
                  <input value={form.venue} onChange={e=>setForm(f=>({...f,venue:e.target.value}))} placeholder="Club name..."
                    style={{width:"100%",background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:"6px 8px",borderRadius:"5px",fontSize:"12px",outline:"none",caretColor:T.accent}} />
                </div>
              </div>
              <div style={{marginBottom:"10px"}}>
                <div style={{fontSize:"10px",color:T.textMuted,marginBottom:"5px",textTransform:"uppercase"}}>Rating</div>
                <div style={{display:"flex",gap:"6px"}}>
                  {[1,2,3,4,5].map(r=>(
                    <button key={r} onClick={()=>setForm(f=>({...f,rating:r}))}
                      style={{background:"transparent",border:"none",cursor:"pointer",fontSize:"22px",opacity:r<=form.rating?1:0.25,transition:"opacity 0.1s",padding:0,color:T.accent}}>★</button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:"10px"}}>
                <div style={{fontSize:"10px",color:T.textMuted,marginBottom:"4px",textTransform:"uppercase"}}>Notes</div>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  placeholder="What worked? What didn't?" rows={2}
                  style={{width:"100%",background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:"7px 8px",borderRadius:"5px",fontSize:"12px",outline:"none",resize:"none",caretColor:T.accent}}
                />
              </div>
              <div style={{display:"flex",gap:"8px"}}>
                <button onClick={addPerf} style={{background:T.accent,border:"none",color:T.bg,padding:"7px 16px",borderRadius:"5px",cursor:"pointer",fontSize:"12px",fontWeight:"600",fontFamily:"inherit"}}>Save</button>
                <button onClick={()=>setAdding(false)} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.textSec,padding:"7px 16px",borderRadius:"5px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>Cancel</button>
              </div>
            </div>
          )}
        </div>
        {!adding&&(
          <div style={{padding:"10px 18px",borderTop:`1px solid ${T.border}`,flexShrink:0}}>
            <button onClick={()=>setAdding(true)} style={{background:T.accent,border:"none",color:T.bg,padding:"9px 20px",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontWeight:"600",width:"100%",fontFamily:"inherit"}}>
              + Log Performance
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SET SIDEBAR
// ═══════════════════════════════════════════════════════════

function SetSidebar({sets,activeId,onSelect,onAdd,onDel,onRename,mobOpen,onMobClose}) {
  const [editing,setEditing]=useState(null);
  const [val,setVal]=useState("");
  const commit=(id,fb)=>{onRename(id,val.trim()||fb);setEditing(null);};
  return (
    <aside className={`sidebar${mobOpen?" mob-open":""}`} style={{width:"200px",background:T.surface,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
      <SbHeader label="Sets" onAdd={onAdd} onClose={onMobClose} />
      <div style={{flex:1,overflowY:"auto",padding:"6px"}}>
        {sets.map(s=>(
          <div key={s.id} className="sb-row" onClick={()=>onSelect(s.id)} style={{padding:"8px 10px",borderRadius:"6px",cursor:"pointer",marginBottom:"2px",background:activeId===s.id?T.card:"transparent",border:`1px solid ${activeId===s.id?T.border:"transparent"}`}}>
            {editing===s.id
              ? <input autoFocus value={val} onChange={e=>setVal(e.target.value)}
                  onBlur={()=>commit(s.id,s.title)}
                  onKeyDown={e=>{if(e.key==="Enter")commit(s.id,s.title);if(e.key==="Escape")setEditing(null);}}
                  onClick={e=>e.stopPropagation()}
                  style={{background:"transparent",border:"none",outline:"none",color:T.text,fontSize:"12px",width:"100%",caretColor:T.accent}}
                />
              : <span onDoubleClick={()=>{setEditing(s.id);setVal(s.title);}}
                  style={{fontSize:"12px",color:activeId===s.id?T.text:T.textSec,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  🎬 {s.title}
                </span>
            }
            <div style={{fontSize:"10px",color:T.textMuted,marginTop:"3px"}}>{s.bitIds.length} bit{s.bitIds.length!==1?"s":""}</div>
            {activeId===s.id&&sets.length>1&&(
              <div style={{marginTop:"5px"}}><IBtn label="del" onClick={e=>{e.stopPropagation();onDel(s.id);}} danger /></div>
            )}
          </div>
        ))}
      </div>
      <div style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`,fontSize:"10px",color:T.textMuted}}>Double-click to rename</div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════
// SET EDITOR
// ═══════════════════════════════════════════════════════════

function SetEditor({set,bits,onUpdate,onExport}) {
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOver,setDragOver]= useState(null);
  const setBits   = set.bitIds.map(id=>bits.find(b=>b.id===id)).filter(Boolean);
  const available = bits.filter(b=>!set.bitIds.includes(b.id));
  const totalMins = setBits.reduce((s,b)=>s+estRuntime(b),0);
  const handleDragStart=(e,idx)=>{setDragIdx(idx);e.dataTransfer.effectAllowed="move";};
  const handleDragOver=(e,idx)=>{e.preventDefault();setDragOver(idx);};
  const handleDrop=(e,idx)=>{e.preventDefault();if(dragIdx===null||dragIdx===idx){setDragIdx(null);setDragOver(null);return;}const ids=[...set.bitIds];const[removed]=ids.splice(dragIdx,1);ids.splice(idx,0,removed);onUpdate({bitIds:ids});setDragIdx(null);setDragOver(null);};
  const handleDragEnd=()=>{setDragIdx(null);setDragOver(null);};
  const removeBit=id=>onUpdate({bitIds:set.bitIds.filter(bid=>bid!==id)});
  const addBit=id=>onUpdate({bitIds:[...set.bitIds,id]});
  let running=0;
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"8px 20px",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0,display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
        <span style={{fontSize:"13px",fontWeight:"500",color:T.text,flex:1}}>{set.title}</span>
        <span style={{fontSize:"11px",color:T.accent,fontWeight:"600",whiteSpace:"nowrap"}}>⏱ {safeTime(totalMins)} total</span>
        <button onClick={onExport} className="top-btn" style={{background:"transparent",border:`1px solid ${T.borderLight}`,color:T.textSec,padding:"4px 10px",borderRadius:"5px",cursor:"pointer",fontSize:"10px",fontFamily:"inherit",transition:"all 0.12s"}}>↓ Export Set</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"20px",background:T.bg,display:"flex",gap:"20px",alignItems:"flex-start",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:"220px"}}>
          <div style={{fontSize:"10px",fontWeight:"600",letterSpacing:"0.1em",color:T.textMuted,textTransform:"uppercase",marginBottom:"12px"}}>Set Order — drag to reorder</div>
          {setBits.length===0&&(
            <div style={{padding:"40px",textAlign:"center",border:`2px dashed ${T.border}`,borderRadius:"10px",color:T.textMuted,fontSize:"12px"}}>
              Click bits from the panel to add them
            </div>
          )}
          {setBits.map((b,i)=>{
            const rt=estRuntime(b);running+=rt;
            const isOver=dragOver===i&&dragIdx!==null&&dragIdx!==i;
            return (
              <div key={b.id} draggable onDragStart={e=>handleDragStart(e,i)} onDragOver={e=>handleDragOver(e,i)} onDrop={e=>handleDrop(e,i)} onDragEnd={handleDragEnd}
                style={{padding:"12px 14px",background:T.card,border:`1px solid ${isOver?T.accent:T.border}`,borderTop:isOver?`3px solid ${T.accent}`:`1px solid ${T.border}`,borderRadius:"8px",marginBottom:"7px",cursor:"grab",opacity:dragIdx===i?0.45:1,userSelect:"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px"}}>
                      <span style={{color:T.accent,fontSize:"11px",fontWeight:"700",minWidth:"20px",fontFamily:T.mono}}>{i+1}.</span>
                      <span style={{fontSize:"12px",fontWeight:"500",color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.title}</span>
                    </div>
                    <div style={{display:"flex",gap:"12px",marginLeft:"28px",fontSize:"10px",color:T.textSec}}>
                      <span style={{color:T.accent}}>{safeTime(rt)}</span>
                      <span style={{color:T.textMuted}}>→ {safeTime(running)} running</span>
                      {b.performances.length>0&&<span>★ {(b.performances.reduce((s,p)=>s+p.rating,0)/b.performances.length).toFixed(1)}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
                    <span style={{fontSize:"16px",color:T.textMuted}}>⠿</span>
                    <button onClick={()=>removeBit(b.id)} style={{background:"transparent",border:"none",color:T.textMuted,cursor:"pointer",fontSize:"15px",lineHeight:1,fontFamily:"inherit"}}
                      onMouseEnter={e=>e.currentTarget.style.color=T.red}
                      onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}
                    >×</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {available.length>0&&(
          <div style={{width:"180px",flexShrink:0}}>
            <div style={{fontSize:"10px",fontWeight:"600",letterSpacing:"0.1em",color:T.textMuted,textTransform:"uppercase",marginBottom:"12px"}}>Available Bits</div>
            {available.map(b=>(
              <div key={b.id} className="avail-card" onClick={()=>addBit(b.id)}
                style={{padding:"9px 11px",background:T.card,border:`1px solid ${T.border}`,borderRadius:"8px",marginBottom:"6px",cursor:"pointer",transition:"border-color 0.12s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:"11px",color:T.textSec,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>🎤 {b.title}</span>
                  <span style={{fontSize:"10px",color:T.accent,marginLeft:"6px",flexShrink:0}}>{safeTime(estRuntime(b))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SEARCH VIEW
// ═══════════════════════════════════════════════════════════

function SearchView({query,setQuery,scripts,bits,onOpenScript,onOpenBit}) {
  const q=query.trim().toLowerCase();
  const raw=[];
  if(q.length>=2){
    scripts.forEach(s=>{
      if(s.title.toLowerCase().includes(q))raw.push({type:"script",key:s.id+"_t",title:s.title,text:`Script: ${s.title}`,label:"title",go:()=>onOpenScript(s.id)});
      s.blocks.forEach(b=>{if(b.text.toLowerCase().includes(q))raw.push({type:"script",key:s.id+b.id,title:s.title,text:b.text,label:BL[b.type]||b.type,go:()=>onOpenScript(s.id)});});
    });
    bits.forEach(b=>{
      [["title",b.title],["setup",b.setup],["punchline",b.punchline],["notes",b.notes]].forEach(([label,f])=>{
        if((f||"").toLowerCase().includes(q))raw.push({type:"bit",key:b.id+label,title:b.title,text:f||"",label,go:()=>onOpenBit(b.id)});
      });
    });
  }
  const seen=new Set();
  const results=raw.filter(r=>{if(seen.has(r.key))return false;seen.add(r.key);return true;});
  function Highlight({text,q}){
    if(!q||!text)return <span>{(text||"").slice(0,120)}</span>;
    const idx=text.toLowerCase().indexOf(q);
    if(idx===-1)return <span>{text.slice(0,100)}{text.length>100?"…":""}</span>;
    const start=Math.max(0,idx-40);const snip=text.slice(start,start+130);const lo=snip.toLowerCase().indexOf(q);
    if(lo===-1)return <span>{snip}</span>;
    return <span>{start>0&&"…"}{snip.slice(0,lo)}<mark style={{background:T.accentDim,color:T.accent,borderRadius:"2px",padding:"0 2px"}}>{snip.slice(lo,lo+q.length)}</mark>{snip.slice(lo+q.length)}{(start+130)<text.length&&"…"}</span>;
  }
  return (
    <div style={{flex:1,overflowY:"auto",padding:"28px 20px",background:T.bg}}>
      <div style={{maxWidth:"600px",margin:"0 auto"}}>
        <input value={query} onChange={e=>setQuery(e.target.value)}
          placeholder="Search all scripts and bits..." autoFocus
          style={{width:"100%",background:T.card,border:`1px solid ${T.borderLight}`,color:T.text,padding:"10px 14px",borderRadius:"8px",fontSize:"14px",outline:"none",caretColor:T.accent,marginBottom:"20px"}}
        />
        {q.length<2&&<div style={{textAlign:"center",padding:"40px",color:T.textMuted,fontSize:"12px"}}>Type 2+ characters to search</div>}
        {q.length>=2&&results.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.textMuted,fontSize:"12px"}}>No results for "{query}"</div>}
        {results.length>0&&<>
          <div style={{fontSize:"10px",color:T.textMuted,marginBottom:"10px"}}>{results.length} result{results.length!==1?"s":""}</div>
          {results.map(r=>(
            <div key={r.key} className="result-card" onClick={r.go}
              style={{padding:"12px 14px",background:T.card,border:`1px solid ${T.border}`,borderRadius:"8px",marginBottom:"7px",cursor:"pointer",transition:"border-color 0.12s"}}>
              <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"5px"}}>
                <span style={{fontSize:"12px"}}>{r.type==="script"?"📄":"🎤"}</span>
                <span style={{fontSize:"12px",fontWeight:"600",color:T.text}}>{r.title}</span>
                <span style={{fontSize:"10px",background:r.type==="script"?T.accentDim:T.greenDim,color:r.type==="script"?T.accent:T.green,padding:"1px 6px",borderRadius:"8px"}}>{r.label}</span>
                <span style={{fontSize:"10px",color:T.textMuted,marginLeft:"auto"}}>{r.type==="script"?"screenplay":"stand-up"} ↗</span>
              </div>
              <div style={{fontSize:"11px",color:T.textSec,fontFamily:T.mono,lineHeight:"1.5"}}><Highlight text={r.text} q={q} /></div>
            </div>
          ))}
        </>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MOBILE BAR
// ═══════════════════════════════════════════════════════════

function MobileBar({label,onOpen,onAdd}) {
  return (
    <div className="mob-bar" style={{
      display:"none",position:"fixed",bottom:0,left:0,right:0,
      background:T.surface,borderTop:`1px solid ${T.border}`,
      padding:"10px 14px",alignItems:"center",gap:"10px",zIndex:100,
    }}>
      <button onClick={onOpen} style={{
        flex:1,background:T.card,border:`1px solid ${T.border}`,color:T.textSec,
        padding:"10px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"13px",
        fontFamily:"inherit",display:"flex",alignItems:"center",gap:"10px",
        overflow:"hidden",textAlign:"left",
      }}>
        <span style={{fontSize:"17px",flexShrink:0}}>☰</span>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{label}</span>
      </button>
      <button onClick={onAdd} style={{
        background:T.accent,border:"none",color:T.bg,
        width:"44px",height:"44px",borderRadius:"10px",cursor:"pointer",
        fontSize:"26px",fontFamily:"inherit",display:"flex",
        alignItems:"center",justifyContent:"center",lineHeight:1,flexShrink:0,
      }}>+</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════

function Empty({label,onAdd}) {
  const e=label==="screenplay"?"📽":label==="set"?"🎬":"🎤";
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"14px",color:T.textMuted,background:T.bg}}>
      <span style={{fontSize:"40px",opacity:0.4}}>{e}</span>
      <span style={{fontSize:"13px"}}>No {label} selected</span>
      <button onClick={onAdd} style={{background:T.accent,color:T.bg,border:"none",padding:"8px 22px",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontWeight:"600",fontFamily:"inherit"}}>
        New {label==="screenplay"?"Script":label==="set"?"Set":"Bit"}
      </button>
    </div>
  );
}
