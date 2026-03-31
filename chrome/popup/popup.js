// popup.js — LOK extension

const state = { clipStart: null, clipEnd: null, videoUrl: null, n: 4 };

const N_MIN = 1;
const N_MAX = 16;
const N_HINTS = {
  1:  "Minimum — très lent",
  2:  "Lent",
  4:  "Recommandé",
  8:  "Rapide — attention au réseau",
  16: "Maximum"
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(sec) {
  if (sec === null || sec === undefined) return "--:--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function secToHMS(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function cleanUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("youtube.com") && !u.hostname.includes("youtu.be")) return null;
    const vid = u.searchParams.get("v");
    if (vid) return `https://www.youtube.com/watch?v=${vid}`;
    return url.split("&")[0];
  } catch { return null; }
}

function buildClipUrl() {
  if (!state.videoUrl) return "";
  return state.clipStart !== null
    ? `${state.videoUrl}&t=${Math.floor(state.clipStart)}`
    : state.videoUrl;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  });
}

function setStatus(msg, isError = false) {
  const el = document.getElementById("status-bar");
  el.textContent = msg;
  el.className = isError ? "error" : "";
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.textContent = ""; el.className = ""; }, 3500);
}

// ── Progression ───────────────────────────────────────────────────────────────

function showProgress(data) {
  const fill  = document.getElementById("progress-fill");
  const pct   = document.getElementById("progress-pct");
  const speed = document.getElementById("progress-speed");
  const eta   = document.getElementById("progress-eta");
  const phase = document.getElementById("progress-phase");

  if (!data || data.status === "idle") {
    fill.style.width  = "0%";
    fill.className    = "idle";
    pct.textContent   = "";
    phase.textContent = "En attente";
    speed.textContent = "";
    eta.textContent   = "";
    return;
  }

  if (data.status === "done" || data.status === "ready") {
    fill.style.width  = "100%";
    fill.className    = "done";
    pct.textContent   = "100%";
    phase.textContent = data.status === "ready" ? "Prêt à coller ! (Ctrl+V)" : "Terminé !";
    speed.textContent = "";
    eta.textContent   = "";
    setTimeout(() => showProgress({ status: "idle" }), 5000);
    return;
  }

  if (data.status === "error") {
    fill.style.width  = "100%";
    fill.className    = "error";
    phase.textContent = "Erreur";
    pct.textContent   = data.message || "Erreur";
    speed.textContent = "";
    eta.textContent   = "";
    return;
  }

  // downloading / merging
  const p = Math.min(Math.max(data.percent || 0, 0), 100);
  fill.style.width  = p + "%";
  fill.className    = "";
  pct.textContent   = p.toFixed(1) + "%";
  phase.textContent = data.phase || "téléchargement";
  speed.textContent = data.speed ? data.speed + "/s" : "";
  eta.textContent   = data.eta   ? "ETA " + data.eta : "";
}

// ── Interface N parallèle ─────────────────────────────────────────────────────

function renderN() {
  document.getElementById("n-value").textContent = state.n;
  const hint = N_HINTS[state.n] || "";
  document.getElementById("n-hint").textContent = hint;
  document.getElementById("btn-n-minus").disabled = state.n <= N_MIN;
  document.getElementById("btn-n-plus").disabled  = state.n >= N_MAX;
}

async function changeN(delta) {
  state.n = Math.min(N_MAX, Math.max(N_MIN, state.n + delta));
  await chrome.storage.local.set({ lokN: state.n });
  renderN();
}

// ── UI globale ────────────────────────────────────────────────────────────────

function updateUI() {
  const urlEl  = document.getElementById("url-display");
  const urlBar = document.getElementById("url-bar");
  const times  = document.getElementById("clip-times");

  if (state.videoUrl) {
    urlEl.textContent = state.videoUrl.replace("https://www.youtube.com/watch?v=", "yt/?v=");
    urlBar.classList.add("active");
  } else {
    urlEl.textContent = "Ouvrez une vidéo YouTube";
    urlBar.classList.remove("active");
  }
  times.textContent = `${formatTime(state.clipStart)} → ${formatTime(state.clipEnd)}`;

  const noVideo = !state.videoUrl;
  ["btn-dl-full","btn-copy-full","btn-set-start","btn-set-end",
   "btn-dl-clip","btn-copy-clip"].forEach(id => {
    document.getElementById(id).disabled = noVideo;
  });
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // URL YouTube active
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]) state.videoUrl = cleanUrl(tabs[0].url);

  // Clip times depuis content script
  const s = await chrome.storage.session.get(["lokClipStart", "lokClipEnd", "lokProgress"]);
  if (s.lokClipStart !== undefined) state.clipStart = s.lokClipStart;
  if (s.lokClipEnd   !== undefined) state.clipEnd   = s.lokClipEnd;
  // Restaure la progression (ou état idle)
  showProgress(s.lokProgress || { status: "idle" });

  // N parallèle
  const ls = await chrome.storage.local.get("lokN");
  if (ls.lokN !== undefined) state.n = ls.lokN;

  updateUI();
  renderN();
}

// ── Boutons clip ──────────────────────────────────────────────────────────────

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

document.getElementById("btn-set-start").addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab) return;
  const resp = await chrome.tabs.sendMessage(tab.id, { action: "get_time" }).catch(() => null);
  if (resp?.time !== undefined) {
    state.clipStart = resp.time;
    await chrome.storage.session.set({ lokClipStart: state.clipStart });
    updateUI();
    setStatus(`Début : ${formatTime(state.clipStart)}`);
  } else {
    setStatus("Lisez la vidéo puis réessayez", true);
  }
});

document.getElementById("btn-set-end").addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab) return;
  const resp = await chrome.tabs.sendMessage(tab.id, { action: "get_time" }).catch(() => null);
  if (resp?.time !== undefined) {
    state.clipEnd = resp.time;
    await chrome.storage.session.set({ lokClipEnd: state.clipEnd });
    updateUI();
    setStatus(`Fin : ${formatTime(state.clipEnd)}`);
  } else {
    setStatus("Lisez la vidéo puis réessayez", true);
  }
});

// ── Boutons téléchargement ────────────────────────────────────────────────────

document.getElementById("btn-dl-full").addEventListener("click", async () => {
  if (!state.videoUrl) return;
  setStatus("Connexion au téléchargeur…");
  const resp = await chrome.runtime.sendMessage({ action: "download_full", url: state.videoUrl, n: state.n });
  if (resp.status === "ok") {
    setStatus("Téléchargement lancé !");
  } else {
    setStatus(resp.message || "Erreur", true);
  }
});

document.getElementById("btn-dl-clip").addEventListener("click", async () => {
  if (!state.videoUrl) return;
  if (state.clipStart === null || state.clipEnd === null) {
    setStatus("Définissez début et fin du clip", true); return;
  }
  if (state.clipEnd <= state.clipStart) {
    setStatus("La fin doit être après le début", true); return;
  }
  setStatus("Clip en cours…");
  const resp = await chrome.runtime.sendMessage({
    action: "download_clip",
    url: state.videoUrl,
    start: secToHMS(state.clipStart),
    end:   secToHMS(state.clipEnd),
    n:     state.n
  });
  if (resp.status === "ok") {
    setStatus("Clip lancé !");
  } else {
    setStatus(resp.message || "Erreur", true);
  }
});

// ── Boutons copier ────────────────────────────────────────────────────────────

document.getElementById("btn-copy-full").addEventListener("click", () => {
  if (!state.videoUrl) return;
  copyToClipboard(state.videoUrl);
  setStatus("URL copiée !");
});

document.getElementById("btn-copy-clip").addEventListener("click", () => {
  if (!state.videoUrl) return;
  copyToClipboard(buildClipUrl());
  setStatus("URL clip copiée !");
});

// ── Boutons N ─────────────────────────────────────────────────────────────────

document.getElementById("btn-n-minus").addEventListener("click", () => changeN(-1));
document.getElementById("btn-n-plus").addEventListener("click",  () => changeN(+1));

// ── Progression depuis background ────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "progress") {
    showProgress(msg.payload);
  }
});

init();
