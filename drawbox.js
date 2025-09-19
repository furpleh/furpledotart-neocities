/*
drawbox by https://jhorn.net/
modified by .. basically chatgpt (i don't know how the fuck to code javascript.. sorry)
no need to credit ME.. please don't use my worker shit though :)
i'll leave the worker code somewhere in the site files if you want to have ur hand
at it.. no documentation or whatever though
*/

// ===== CONFIG (your values) =====
const CATBOX_API_URL = "https://catbox.moe/user/api.php";
const CATBOX_USERHASH = ""; // optional
const PROXY_URL = "https://catboxworker.mikusan93989.workers.dev/"; // your Worker for Catbox

// Google Forms
const GOOGLE_FORM_ID         = "1FAIpQLScRhtESYCkLfcZm939y-uuhokRewgtRtoMIqbF8qUYUj4kpaw";
const GOOGLE_FORM_URL_ENTRY  = "entry.1797260879"; // URL field
const GOOGLE_FORM_NAME_ENTRY = "entry.573539142";  // NAME field ("who")
const FORMS_PROXY_URL        = "https://catboxworker.mikusan93989.workers.dev/forms";

// Google Sheet (CSV by gid)
const SHEET_ID  = "12nJYg07d5qHJJg1WGjhrTpu29vbgkRNwEa1H7cVxLcw";
const SHEET_GID = "1442127238";
const SHEET_NAME = ""; // unused

// ===== GLOBALS expected by HTML =====
window.stroke_color = window.stroke_color || "#000000";
window.stroke_width = window.stroke_width || 2;
window.change_color = (el) => { window.stroke_color = (el?.style?.background || "#000000"); };
window.set_stroke_width = (n) => { window.stroke_width = Math.max(1, Number(n) || 1); };

// ===== CANVAS & DRAWING =====
const canvas = document.getElementById("drawboxcanvas");
const ctx = canvas.getContext("2d");
canvas.width = 500;
canvas.height = 500;

function fillWhite() {
  ctx.save();
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}
fillWhite();

let history = [];
let histIndex = -1;
let drawing = false;

function snapshotPush() {
  try {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    history = history.slice(0, histIndex + 1);
    history.push(img);
    histIndex = history.length - 1;
  } catch {}
}
function restoreTo(i) { const d = history[i]; if (d) ctx.putImageData(d, 0, 0); }
function undo() { if (histIndex > 0) { histIndex--; restoreTo(histIndex); } }
function redo() { if (histIndex < history.length - 1) { histIndex++; restoreTo(histIndex); } }
snapshotPush();

function getPos(e) {
  const r = canvas.getBoundingClientRect();
  const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
  const clientY = (e.touches ? e.touches[0].clientY : e.clientY);
  let x = clientX - r.left;
  let y = clientY - r.top;
  // Scale from displayed size back to internal 500x500 canvas coordinates
  const scaleX = canvas.width / r.width;
  const scaleY = canvas.height / r.height;
  x *= scaleX;
  y *= scaleY;
  return {
    x: Math.max(0, Math.min(canvas.width, x)),
    y: Math.max(0, Math.min(canvas.height, y))
  };
}
function down(e) { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); }
function move(e) {
  if (!drawing) return;
  const p = getPos(e);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = window.stroke_color;
  ctx.lineWidth = Math.max(1, Number(window.stroke_width) || 1);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  e.preventDefault();
}
function up() { if (!drawing) return; drawing = false; snapshotPush(); }

canvas.addEventListener("mousedown", down);
canvas.addEventListener("mousemove", move);
canvas.addEventListener("mouseup", up);
canvas.addEventListener("mouseleave", up);
canvas.addEventListener("touchstart", down, {passive:false});
canvas.addEventListener("touchmove",  move, {passive:false});
canvas.addEventListener("touchend",   up);

document.getElementById("undo")?.addEventListener("click", undo);
document.getElementById("redo")?.addEventListener("click", redo);
document.addEventListener("keydown", (e)=>{
  const k = e.key.toLowerCase();
  if (e.ctrlKey && !e.shiftKey && k === "z") { e.preventDefault(); undo(); }
  if ((e.ctrlKey && e.shiftKey && k === "z") || (e.ctrlKey && k === "y")) { e.preventDefault(); redo(); }
});
window.Restore = undo; window.Redo = redo;
window.Clear = function(){ fillWhite(); snapshotPush(); };
ctx.drawImage = function(){ console.warn("drawImage disabled."); };

// ===== UPLOAD & GALLERY =====
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submit");
const gallery = document.getElementById("gallery");
const emptyMsg = document.getElementById("emptyMsg");
const nameInput = document.getElementById("artistName");

function hideEmpty() { if (emptyMsg) emptyMsg.style.display = "none"; }
function showEmpty() { if (emptyMsg) emptyMsg.style.display = ""; }

function setStatus(text, link) {
  if (!statusEl) return;
  if (link) statusEl.innerHTML = `${text} <a href="${link}" target="_blank" rel="noopener noreferrer">${link}</a>`;
  else statusEl.textContent = text;
}

// Helper for manual test
window.openPrefilledForm = function(url, name="") {
  const params = new URLSearchParams();
  params.set(GOOGLE_FORM_URL_ENTRY, url);
  if (name) params.set(GOOGLE_FORM_NAME_ENTRY, name);
  const prefill = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/viewform?${params.toString()}`;
  window.open(prefill, "_blank", "noopener");
};

async function toBlobPNG(node) { return new Promise((res, rej)=> node.toBlob(b=>b?res(b):rej(new Error("PNG encode failed")), "image/png", 1)); }

async function uploadViaProxy(blob, filename) {
  const fd = new FormData();
  fd.append("file", new File([blob], filename, { type:"image/png" }));
  const r = await fetch(PROXY_URL, { method:"POST", body:fd });
  const t = await r.text();
  if (!r.ok || !/^https?:\/\//i.test(t.trim())) throw new Error(t || `HTTP ${r.status}`);
  return t.trim();
}
async function uploadViaCatbox(blob, filename) {
  const fd = new FormData();
  fd.append("reqtype","fileupload");
  if (CATBOX_USERHASH.trim()) fd.append("userhash", CATBOX_USERHASH.trim());
  fd.append("fileToUpload", new File([blob], filename, { type:"image/png" }));
  const r = await fetch(CATBOX_API_URL, { method:"POST", body:fd });
  const t = await r.text();
  if (!r.ok || !/^https?:\/\//i.test(t.trim())) throw new Error(t || `HTTP ${r.status}`);
  return t.trim();
}

async function submitToGoogleForm(url, nameValue) {
  if (!GOOGLE_FORM_ID || !GOOGLE_FORM_URL_ENTRY) return;
  const fields = { [GOOGLE_FORM_URL_ENTRY]: url };
  if (GOOGLE_FORM_NAME_ENTRY && nameValue) fields[GOOGLE_FORM_NAME_ENTRY] = nameValue;

  if (FORMS_PROXY_URL) {
    try {
      const res = await fetch(FORMS_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: GOOGLE_FORM_ID, fields }),
      });
      if (!res.ok) throw new Error("Forms proxy error " + res.status);
      setStatus("Submitted :3");
    } catch (e) {
      console.warn(e);
      setStatus("Uploaded, but form submit failed via proxy.");
    }
    return;
  }

  const endpoint = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/formResponse`;
  const body = new URLSearchParams({ "submit":"Submit", ...fields });
  fetch(endpoint, {
    method:"POST",
    mode:"no-cors",
    referrerPolicy:"no-referrer",
    headers:{ "Content-Type":"application/x-www-form-urlencoded" },
    body: body.toString()
  }).catch(()=>{});
}

async function uploadHandler() {
  submitBtn.disabled = true;
  try {
    setStatus("Encoding PNG...");
    const blob = await toBlobPNG(canvas);
    const filename = `drawbox_${Date.now()}.png`;

    setStatus(PROXY_URL ? "Uploading via proxy..." : "Uploading to Catbox...");
    const url = await (PROXY_URL ? uploadViaProxy(blob, filename) : uploadViaCatbox(blob, filename));
    setStatus("Uploaded!", url);

    const nameVal = (nameInput?.value || "").trim();
    await submitToGoogleForm(url, nameVal);

    addImageToGallery(url, new Date().toLocaleString(), nameVal);
    hideEmpty();
    setTimeout(fetchGallery, 5000);
  } catch (err) {
    console.error(err);
    setStatus("Error: " + (err?.message || err));
  } finally {
    submitBtn.disabled = false;
  }
}
submitBtn?.addEventListener("click", uploadHandler);

// ===== GALLERY LOADER =====
function buildCsvUrl() {
  if (!SHEET_ID || !SHEET_GID) return null;
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
}
function buildGvizUrl() {
  if (!SHEET_ID || !SHEET_NAME) return null;
  const encoded = encodeURIComponent(SHEET_NAME);
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encoded}`;
}
function csvParse(text) {
  const rows = [];
  let row = [], cell = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i+1];
    if (inQuotes) {
      if (c === '"' && n === '"') { cell += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cell += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cell); cell = ""; }
      else if (c === '\r') { /* ignore */ }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ""; }
      else { cell += c; }
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function fetchGallery() {
  if (!gallery) return;
  try {
    gallery.textContent = "Loading images...";
    let items = [];
    const csvUrl = buildCsvUrl();
    if (csvUrl) {
      const res = await fetch(csvUrl);
      const text = await res.text();
      items = extractFromCsvAnyUrlAndName(text);
    } else {
      const res = await fetch(buildGvizUrl());
      const raw = await res.text();
      items = extractFromGvizAnyUrlAndName(JSON.parse(raw.match(/setResponse\(([\s\S]+?)\);?/)[1]));
    }
    gallery.innerHTML = "";
    if (!items.length) {
      gallery.textContent = "";
      showEmpty();
      return;
    }
    hideEmpty();
    for (const it of items) addImageToGallery(it.url, it.when, it.name);
  } catch (e) {
    console.error(e);
    gallery.textContent = "Failed to load gallery (check Sheet publish/sharing).";
  }
}

const NAME_HEADER_RE = /(name|artist|by|who|username|handle)/i;

function extractFromCsvAnyUrlAndName(text) {
  const rows = csvParse(text);
  if (!rows.length) return [];
  const header = rows[0].map(h => (h||"").toLowerCase());
  const tsIdx = header.findIndex(h => h.includes("timestamp"));
  let nameIdx = header.findIndex(h => NAME_HEADER_RE.test(h));
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    // URL: first URL in any cell, and remember its column index
    let u = null, urlIdx = -1;
    for (let c = 0; c < r.length; c++) {
      const cell = (r[c] || "").trim();
      const m = cell.match(/https?:\/\/[^\s"]+/i);
      if (m) { u = m[0]; urlIdx = c; break; }
    }
    if (u) {
      // Name: prefer explicit name header; otherwise try neighbor cells (left/right of url)
      let name = (nameIdx>=0 ? (r[nameIdx] || "") : "");
      if (!name && urlIdx >= 0) {
        const left = r[urlIdx - 1] || "";
        const right = r[urlIdx + 1] || "";
        const pick = (s)=> (s && !/^https?:\/\//i.test(s) ? s : "");
        name = pick(left) || pick(right) || "";
      }
      const when = (tsIdx>=0 ? r[tsIdx] : "");
      out.push({ url:u, when, name });
    }
  }
  return out.reverse();
}
function extractFromGvizAnyUrlAndName(obj) {
  const table = obj.table;
  const cols = (table.cols||[]).map(c=> (c.label||"").toLowerCase());
  const tsIdx = cols.findIndex(h => h.includes("timestamp"));
  let nameIdx = cols.findIndex(h => NAME_HEADER_RE.test(h));
  const out = [];
  for (const row of (table.rows||[])) {
    const cells = row.c||[];
    // URL anywhere in the row
    let u = null, urlIdx = -1;
    for (let c = 0; c < cells.length; c++) {
      const v = (cells[c]?.v || "").toString().trim();
      const m = v.match(/https?:\/\/[^\s"]+/i);
      if (m) { u = m[0]; urlIdx = c; break; }
    }
    if (u) {
      let name = (nameIdx>=0 ? (cells[nameIdx]?.v || "") : "");
      if (!name && urlIdx >= 0) {
        const left = (cells[urlIdx - 1]?.v || "");
        const right = (cells[urlIdx + 1]?.v || "");
        const pick = (s)=> (s && !/^https?:\/\//i.test(String(s)) ? s : "");
        name = pick(left) || pick(right) || "";
      }
      const when = (tsIdx>=0 ? (cells[tsIdx]?.v || "") : "");
      out.push({ url:u, when, name });
    }
  }
  return out.reverse();
}

function addImageToGallery(url, when="", name="") {
  if (!gallery) return;
  const wrap = document.createElement("div");
  wrap.className = "image-container";
  const img = document.createElement("img");
  img.loading = "lazy";
  img.src = url;
  img.alt = name ? `drawing by ${name}` : "drawing";
  const p = document.createElement("p");
  p.textContent = [name ? `by ${name}` : "", when].filter(Boolean).join(" • ");
  wrap.appendChild(img);
  wrap.appendChild(p);
  gallery.prepend(wrap);
}

document.addEventListener("DOMContentLoaded", fetchGallery);
