import { useState } from "react";
import { T, btn, input } from "../theme";
import { login } from "../lib/store";

export default function Login({ unconfigured }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!pw) return;
    setBusy(true); setErr("");
    try { await login(pw); }
    catch (ex) { setErr(ex.status === 401 ? "Wrong password." : "Couldn't reach the server. Check your connection."); }
    finally { setBusy(false); }
  };

  return (
    <div style={{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,fontFamily:T.sans,padding:"16px"}}>
      <form onSubmit={submit} style={{width:"100%",maxWidth:"320px",textAlign:"center"}}>
        <div style={{fontFamily:T.mono,fontSize:"18px",fontWeight:"700",color:T.accent,letterSpacing:"0.08em",marginBottom:"6px"}}>✍ COMIC DRAFT</div>
        <div style={{fontSize:"12px",color:T.textSec,marginBottom:"24px"}}>Ideas · outlines · scripts · stand-up</div>
        {unconfigured
          ? <div style={{fontSize:"12.5px",color:T.textSec,lineHeight:1.6,background:T.card,border:`1px solid ${T.border}`,borderRadius:"8px",padding:"14px"}}>
              Sign-in isn't set up yet. Add an <code style={{color:T.accent}}>APP_PASSWORD</code> environment variable in Vercel and redeploy.
            </div>
          : <>
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Password" autoFocus autoComplete="current-password"
                style={{...input,width:"100%",fontSize:"15px",padding:"11px 14px",marginBottom:"10px",textAlign:"center"}} />
              <button type="submit" disabled={busy || !pw} style={{...btn.primary,width:"100%",padding:"11px",fontSize:"13px",opacity:busy||!pw?0.6:1}}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
              {err && <div style={{color:T.red,fontSize:"12px",marginTop:"12px"}}>{err}</div>}
              <div style={{color:T.textMuted,fontSize:"10.5px",marginTop:"18px"}}>Stays signed in on this device for a year.</div>
            </>}
      </form>
    </div>
  );
}
