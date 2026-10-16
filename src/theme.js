export const T = {
  bg:"#15130d", surface:"#1b1912", card:"#22201a", border:"#333020", borderLight:"#4a4530",
  text:"#e2d9c0", textSec:"#8a8264", textMuted:"#5a563c",
  accent:"#d4a84b", accentDim:"#7a6028",
  green:"#5a9a5a", greenDim:"#2a4a2a",
  blue:"#6a9ac4", red:"#c46a6a", purple:"#a07ac4",
  mono:"'Courier Prime','Courier New',monospace",
  sans:"'DM Sans',system-ui,sans-serif",
};

const GFONT = `@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');`;

export const GLOBAL_CSS = `
  ${GFONT}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:${T.bg}}
  ::selection{background:${T.accentDim};color:${T.text}}
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-track{background:${T.bg}}
  ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
  textarea,input,select,button{font-family:inherit}
  textarea::placeholder,input::placeholder{color:${T.textMuted}}
  .sb-row:hover{background:${T.card}!important}
  .block-row:hover .tbadge{opacity:1!important}
  .iab:hover{color:${T.accent}!important}
  .iab-rd:hover{color:${T.red}!important}
  .add-type:hover{border-color:${T.accent}!important}
  .hover-accent:hover{border-color:${T.accent}!important}
  .top-btn:hover{border-color:${T.accent}!important;color:${T.accent}!important}
  .node-row:hover .node-tools{opacity:1!important}
  .tab-label{display:inline}
  @media (max-width: 900px) { .tab-label{display:none} }
  @media (max-width: 600px) {
    .sidebar {
      position: fixed !important;
      top: 0 !important; bottom: 0 !important; left: 0 !important;
      width: 82vw !important; max-width: 300px !important;
      z-index: 200 !important;
      transform: translateX(-105%);
      transition: transform 0.22s ease;
    }
    .sidebar.mob-open { transform: translateX(0) !important; box-shadow: 6px 0 28px rgba(0,0,0,0.65); }
    .mob-hide { display: none !important; }
    .mob-bar { display: flex !important; }
    .mob-close { display: flex !important; }
    .mob-backdrop { display: block !important; }
    .tbadge { display: none !important; }
    .editor-pad { padding: 20px 16px 140px !important; }
    main { padding-bottom: 64px !important; }
  }
`;

export const btn = {
  ghost: {background:"transparent",border:`1px solid ${T.borderLight}`,color:T.textSec,padding:"4px 10px",borderRadius:"5px",cursor:"pointer",fontSize:"11px",whiteSpace:"nowrap",transition:"all 0.12s"},
  primary: {background:T.accent,border:"none",color:T.bg,padding:"7px 16px",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontWeight:"600",whiteSpace:"nowrap"},
};

export const input = {background:T.card,border:`1px solid ${T.border}`,color:T.text,padding:"7px 10px",borderRadius:"6px",fontSize:"12px",outline:"none",caretColor:T.accent};

export const label = {fontSize:"10px",fontWeight:"600",letterSpacing:"0.1em",color:T.textMuted,textTransform:"uppercase"};
