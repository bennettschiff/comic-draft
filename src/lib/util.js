export const uid = () =>
  (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, "").slice(0, 16);

export const wc = s => (s || "").trim().split(/\s+/).filter(Boolean).length;

export function autoResize(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

export function download(name, text) {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([text], { type: "text/plain" })),
    download: name,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

export const fileName = (title, ext) => (title || "untitled").trim().replace(/[^\w-]+/g, "_") + ext;

export const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function openPrint(title, css, body) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}<script>window.onload=function(){window.print()}<\/script></body></html>`;
  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

export const mmss = mins => {
  const m = Math.floor(mins), s = Math.round((mins - m) * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

export const estRuntime = bit => {
  if (bit.duration) return parseFloat(bit.duration);
  return Math.max(0.5, Math.round(wc((bit.setup || "") + " " + (bit.punchline || "")) / 100 * 10) / 10);
};

export const avgRating = perfs =>
  perfs?.length ? (perfs.reduce((s, p) => s + p.rating, 0) / perfs.length).toFixed(1) : null;

export const byNewest = (a, b) => (b.updated || b.created || 0) - (a.updated || a.created || 0);

export const shortDate = ts => new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
