import { useState } from "react";
import { T, btn } from "../theme";

export function Sidebar({ label, onAdd, mobOpen, onMobClose, children, top, footer }) {
  return (
    <aside className={`sidebar${mobOpen ? " mob-open" : ""}`} style={{width:"220px",background:T.surface,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
      <div style={{padding:"11px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <span style={{fontSize:"10px",fontWeight:"600",letterSpacing:"0.1em",color:T.textMuted,textTransform:"uppercase"}}>{label}</span>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <button className="mob-close" onClick={onMobClose} aria-label="Close list"
            style={{display:"none",background:"transparent",border:"none",color:T.textMuted,cursor:"pointer",fontSize:"20px",lineHeight:1,padding:"0 2px"}}>×</button>
          <button onClick={onAdd} className="hover-accent" aria-label={`New ${label}`}
            style={{background:"transparent",border:`1px solid ${T.borderLight}`,color:T.accent,width:"22px",height:"22px",borderRadius:"4px",cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>+</button>
        </div>
      </div>
      {top}
      <div style={{flex:1,overflowY:"auto",padding:"6px"}}>{children}</div>
      {footer && <div style={{padding:"9px 14px",borderTop:`1px solid ${T.border}`,fontSize:"10px",color:T.textMuted}}>{footer}</div>}
    </aside>
  );
}

// A sidebar row with inline rename (double-click) and actions under the active row.
export function SbRow({ active, icon, title, sub, onSelect, onRename, actions }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const commit = () => { onRename?.(val.trim() || title); setEditing(false); };
  return (
    <div className="sb-row" onClick={onSelect}
      style={{padding:"8px 10px",borderRadius:"6px",cursor:"pointer",marginBottom:"2px",background:active?T.card:"transparent",border:`1px solid ${active?T.border:"transparent"}`}}>
      {editing
        ? <input autoFocus value={val} onChange={e=>setVal(e.target.value)} onBlur={commit}
            onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape")setEditing(false);}}
            onClick={e=>e.stopPropagation()}
            style={{background:"transparent",border:"none",outline:"none",color:T.text,fontSize:"12px",width:"100%",caretColor:T.accent}} />
        : <span onDoubleClick={()=>{ if(onRename){ setEditing(true); setVal(title); } }}
            style={{fontSize:"12px",color:active?T.text:T.textSec,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {icon} {title || "Untitled"}
          </span>}
      {sub && <div style={{fontSize:"10px",color:T.textMuted,marginTop:"3px"}}>{sub}</div>}
      {active && !editing && actions && (
        <div style={{display:"flex",gap:"2px",marginTop:"5px",flexWrap:"wrap"}} onClick={e=>e.stopPropagation()}>{actions}</div>
      )}
    </div>
  );
}

export function IBtn({ onClick, label, danger = false, title }) {
  return (
    <button className={danger ? "iab iab-rd" : "iab"} onClick={onClick} title={title}
      style={{background:"transparent",border:"none",cursor:"pointer",color:T.textMuted,fontSize:"10px",fontWeight:"600",padding:"2px 6px",borderRadius:"3px",transition:"color 0.1s"}}>
      {label}
    </button>
  );
}

export function MobileBar({ label, onOpen, onAdd }) {
  return (
    <div className="mob-bar" style={{display:"none",position:"fixed",bottom:0,left:0,right:0,background:T.surface,borderTop:`1px solid ${T.border}`,padding:"10px 14px calc(10px + env(safe-area-inset-bottom))",alignItems:"center",gap:"10px",zIndex:100}}>
      <button onClick={onOpen} style={{flex:1,background:T.card,border:`1px solid ${T.border}`,color:T.textSec,padding:"10px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"13px",display:"flex",alignItems:"center",gap:"10px",overflow:"hidden",textAlign:"left"}}>
        <span style={{fontSize:"17px",flexShrink:0}}>☰</span>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{label}</span>
      </button>
      {onAdd && <button onClick={onAdd} aria-label="New" style={{background:T.accent,border:"none",color:T.bg,width:"44px",height:"44px",borderRadius:"10px",cursor:"pointer",fontSize:"26px",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,flexShrink:0}}>+</button>}
    </div>
  );
}

export function Empty({ icon, text, action, onAction }) {
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"14px",color:T.textMuted,background:T.bg,padding:"24px",textAlign:"center"}}>
      <span style={{fontSize:"40px",opacity:0.4}}>{icon}</span>
      <span style={{fontSize:"13px",maxWidth:"320px",lineHeight:1.5}}>{text}</span>
      {action && <button onClick={onAction} style={btn.primary}>{action}</button>}
    </div>
  );
}

export function Modal({ title, sub, onClose, children, footer, width = 520 }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"16px"}} onClick={onClose}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:"12px",width:"100%",maxWidth:`${width}px`,maxHeight:"88vh",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,gap:"10px"}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:"13px",fontWeight:"600",color:T.text}}>{title}</div>
            {sub && <div style={{fontSize:"11px",color:T.textSec,marginTop:"2px"}}>{sub}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{background:"transparent",border:"none",color:T.textSec,cursor:"pointer",fontSize:"22px",lineHeight:1}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>{children}</div>
        {footer && <div style={{padding:"10px 18px",borderTop:`1px solid ${T.border}`,flexShrink:0}}>{footer}</div>}
      </div>
    </div>
  );
}

// A grid of big choice cards (format picker, template picker).
export function ChoiceGrid({ options, onPick }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"8px"}}>
      {options.map(o => (
        <button key={o.id} onClick={()=>onPick(o.id)} className="hover-accent"
          style={{textAlign:"left",background:T.card,border:`1px solid ${T.border}`,borderRadius:"8px",padding:"12px",cursor:"pointer",color:T.text,transition:"border-color 0.12s"}}>
          <div style={{fontSize:"13px",fontWeight:"600",marginBottom:"4px"}}>{o.icon} {o.label}</div>
          <div style={{fontSize:"11px",color:T.textSec,lineHeight:1.4}}>{o.desc}</div>
        </button>
      ))}
    </div>
  );
}

// Toolbar shown while a row is focused. Buttons use onMouseDown+preventDefault so focus stays in the textarea.
export function FocusBar({ children }) {
  return (
    <div style={{position:"sticky",top:0,zIndex:5,display:"flex",gap:"4px",flexWrap:"wrap",padding:"6px 10px",background:T.surface,borderBottom:`1px solid ${T.border}`}}>
      {children}
    </div>
  );
}

export function BarBtn({ onPress, active, color, children, title }) {
  return (
    <button title={title} onMouseDown={e=>e.preventDefault()} onClick={onPress}
      style={{background:active?T.card:"transparent",border:`1px solid ${active?(color||T.accent):T.border}`,color:color||T.textSec,padding:"5px 9px",borderRadius:"5px",cursor:"pointer",fontSize:"10.5px",fontWeight:"700",minWidth:"34px"}}>
      {children}
    </button>
  );
}
