import { T } from "../theme";
import { download, esc, fileName, openPrint, uid } from "./util";

// ── Block types ─────────────────────────────────────────────

export const BLOCKS = {
  "act":           { label:"ACT",    color:"#e8c060", ph:"COLD OPEN / ACT ONE / TAG",  next:"scene-heading" },
  "scene-heading": { label:"SCENE",  color:"#d4a84b", ph:"INT. LOCATION — DAY",        next:"action" },
  "action":        { label:"ACTION", color:"#7ab87a", ph:"Describe the action...",     next:"action" },
  "character":     { label:"CHAR",   color:"#7ab0d4", ph:"CHARACTER NAME",             next:"dialogue" },
  "dialogue":      { label:"DIALOG", color:"#c8b0d8", ph:"What they say...",           next:"character" },
  "parenthetical": { label:"PAREN",  color:"#8aaa7a", ph:"beat",                       next:"dialogue" },
  "transition":    { label:"TRANS",  color:"#d4907a", ph:"CUT TO:",                    next:"scene-heading" },
  "note":          { label:"NOTE",   color:"#8a8468", ph:"Note to self (not printed)", next:"action" },
};

const SCREEN = ["scene-heading","action","character","dialogue","parenthetical","transition","note"];

export const FORMATS = {
  film:   { label:"Film",        icon:"🎞", types: SCREEN,           desc:"Feature or short screenplay" },
  tv:     { label:"TV / Sitcom", icon:"📺", types: ["act", ...SCREEN], desc:"Act breaks, cold open, tag; single- or multi-cam" },
  sketch: { label:"Sketch",      icon:"🎭", types: SCREEN,           desc:"Short piece with a premise → game → button brain" },
};

export const newBlock = (type = "action", text = "") => ({ id: uid(), type, text });

export function newScript(format = "film", extra = {}) {
  const blocks = format === "tv"
    ? [newBlock("act", "COLD OPEN"), newBlock("scene-heading")]
    : [newBlock("scene-heading")];
  const meta = format === "tv" ? { show: "", episode: "", multicam: false }
    : format === "sketch" ? { premise: "", base: "", game: "", heightens: "", button: "" }
    : {};
  return { title: "Untitled " + (format === "sketch" ? "Sketch" : format === "tv" ? "Episode" : "Script"), format, blocks, meta, ...extra };
}

// Typing a slugline into an action block promotes it to a scene heading.
export const looksLikeSlug = text => /^(INT|EXT|INT\.?\/EXT|I\/E|EST)[. ]/i.test(text);

// ── Editor styling ──────────────────────────────────────────

export function blockStyle(type, { multicam = false } = {}) {
  const base = {fontFamily:T.mono,fontSize:"13.5px",lineHeight:"1.75",border:"none",background:"transparent",resize:"none",outline:"none",overflow:"hidden",display:"block",color:T.text,caretColor:T.accent,width:"100%",padding:"1px 0"};
  const c = BLOCKS[type]?.color;
  switch (type) {
    case "act":           return {...base,fontWeight:"700",color:c,textTransform:"uppercase",textAlign:"center",textDecoration:"underline",marginTop:"36px",marginBottom:"8px",letterSpacing:"0.06em"};
    case "scene-heading": return {...base,fontWeight:"700",color:c,textTransform:"uppercase",marginTop:"28px",paddingBottom:"6px",borderBottom:`1px solid ${T.border}`,textDecoration:multicam?"underline":"none"};
    case "action":        return {...base,marginBottom:"2px",textTransform:multicam?"uppercase":"none"};
    case "character":     return {...base,marginLeft:"37%",width:"40%",textTransform:"uppercase",fontWeight:"700",color:c,marginTop:"16px"};
    case "dialogue":      return {...base,marginLeft:"20%",width:"60%",lineHeight:multicam?"2.4":"1.75"};
    case "parenthetical": return {...base,marginLeft:"28%",width:"44%",fontStyle:"italic",color:T.textSec};
    case "transition":    return {...base,textAlign:"right",textTransform:"uppercase",fontWeight:"700",color:c,marginTop:"16px",marginBottom:"4px"};
    case "note":          return {...base,fontFamily:T.sans,fontSize:"12.5px",fontStyle:"italic",color:c,background:"#1f1d14",borderLeft:`3px solid ${T.borderLight}`,padding:"4px 10px",margin:"10px 0 4px",borderRadius:"0 4px 4px 0"};
    default:              return base;
  }
}

// ── Export: plain text ──────────────────────────────────────

const paren = t => `(${t.replace(/^\(|\)$/g, "")})`;

export function exportTxt(script) {
  const mc = script.format === "tv" && script.meta?.multicam;
  let out = `${script.title.toUpperCase()}\n`;
  if (script.format === "tv" && script.meta?.episode) out += `"${script.meta.episode}"\n`;
  out += `\n${"─".repeat(60)}\n\n`;
  for (const b of script.blocks) {
    const t = b.text.trim();
    if (!t || b.type === "note") continue;
    switch (b.type) {
      case "act":           out += `\n${" ".repeat(Math.max(0, 30 - t.length / 2))}${t.toUpperCase()}\n\n`; break;
      case "scene-heading": out += `\n${t.toUpperCase()}\n\n`; break;
      case "action":        out += `${mc ? t.toUpperCase() : t}\n\n`; break;
      case "character":     out += `${" ".repeat(30)}${t.toUpperCase()}\n`; break;
      case "dialogue":      out += `${" ".repeat(20)}${t}\n${mc ? "\n" : ""}\n`; break;
      case "parenthetical": out += `${" ".repeat(25)}${paren(t)}\n`; break;
      case "transition":    out += `${" ".repeat(50)}${t.toUpperCase()}\n\n`; break;
    }
  }
  download(fileName(script.title, ".txt"), out);
}

// ── Export: Fountain (opens in Final Draft, Highland, WriterSolo, etc.) ──

export function exportFountain(script) {
  const lines = [`Title: ${script.title}`];
  if (script.format === "tv" && script.meta?.episode) lines.push(`Episode: ${script.meta.episode}`);
  lines.push("", "");
  let prev = null;
  for (const b of script.blocks) {
    const t = b.text.trim();
    if (!t) continue;
    const inDialogue = ["character", "parenthetical"].includes(prev) && ["parenthetical", "dialogue"].includes(b.type);
    if (!inDialogue && prev) lines.push("");
    switch (b.type) {
      case "act":           lines.push(`> ${t.toUpperCase()} <`); break;
      case "scene-heading": lines.push(looksLikeSlug(t) ? t.toUpperCase() : `.${t.toUpperCase()}`); break;
      case "action":        lines.push(t === t.toUpperCase() && /[A-Z]/.test(t) ? `!${t}` : t); break;
      case "character":     lines.push(`@${t.toUpperCase()}`); break;
      case "parenthetical": lines.push(paren(t)); break;
      case "dialogue":      lines.push(t); break;
      case "transition":    lines.push(`> ${t.toUpperCase()}`); break;
      case "note":          lines.push(`[[${t}]]`); break;
    }
    prev = b.type;
  }
  download(fileName(script.title, ".fountain"), lines.join("\n") + "\n");
}

// ── Print / PDF ─────────────────────────────────────────────

export function printScript(script) {
  const mc = script.format === "tv" && script.meta?.multicam;
  let body = `<div class="tp"><h1>${esc(script.title)}</h1>`;
  if (script.format === "tv" && script.meta?.show) body += `<p class="show">${esc(script.meta.show)}</p>`;
  if (script.format === "tv" && script.meta?.episode) body += `<p>“${esc(script.meta.episode)}”</p>`;
  body += `</div>`;
  let sceneNo = 0, firstAct = true;
  for (const b of script.blocks) {
    const t = esc(b.text.trim());
    if (!t || b.type === "note") continue;
    switch (b.type) {
      case "act":
        body += `<p class="act${firstAct ? "" : " brk"}">${t}</p>`;
        firstAct = false;
        break;
      case "scene-heading":
        sceneNo++;
        body += `<p class="sh">${mc ? `<span class="sl">${String.fromCharCode(64 + ((sceneNo - 1) % 26) + 1)}</span>` : ""}${t}</p>`;
        break;
      case "action":        body += `<p class="ac">${t}</p>`; break;
      case "character":     body += `<p class="ch">${t}</p>`; break;
      case "dialogue":      body += `<p class="dl">${t}</p>`; break;
      case "parenthetical": body += `<p class="pa">${esc(paren(b.text.trim()))}</p>`; break;
      case "transition":    body += `<p class="tr">${t}</p>`; break;
    }
  }
  const css = `*{box-sizing:border-box}body{font-family:'Courier Prime','Courier New',Courier,monospace;font-size:12pt;line-height:1.15;margin:0;padding:1in 1in 1in 1.5in}p{margin:0;white-space:pre-wrap}
.tp{text-align:center;margin:2.5in 0 3in;page-break-after:always}.tp h1{font-size:14pt;text-transform:uppercase;letter-spacing:.05em;text-decoration:underline}.tp p{margin-top:1em}
.act{text-align:center;font-weight:bold;text-transform:uppercase;text-decoration:underline;margin:0 0 1.2em}.act.brk{page-break-before:always}
.sh{font-weight:bold;text-transform:uppercase;margin:1.5em 0 1em${mc ? ";text-decoration:underline" : ""}}.sl{display:inline-block;width:.5in;margin-left:-.5in}
.ac{margin-bottom:1em${mc ? ";text-transform:uppercase" : ""}}
.ch{margin-left:2.2in;text-transform:uppercase;margin-top:1em}
.dl{margin-left:1in;margin-right:1.5in;margin-bottom:1em${mc ? ";line-height:2" : ""}}
.pa{margin-left:1.6in;margin-right:2in}
.tr{text-align:right;text-transform:uppercase;margin:1em 0}
@page{margin:1in}@media print{body{padding:0 0 0 .5in}}`;
  openPrint(script.title, css, body);
}

// Sketch brain fields, in writing order.
export const SKETCH_FIELDS = [
  ["premise",   "Premise",       "One sentence. Who, where, what's off."],
  ["base",      "Base reality",  "The normal world before the weird thing shows up."],
  ["game",      "The game",      "The unusual thing, stated as a repeatable pattern: if this is true, what else is true?"],
  ["heightens", "Heightens",     "Each beat escalates the game. One per line."],
  ["button",    "Button",        "The last laugh. How it ends."],
];
