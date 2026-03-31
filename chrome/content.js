// content.js — LOK extension (Chrome)
// Identique à la version Firefox mais utilise chrome.* API

(function () {
  "use strict";

  // Polyfill minimal : chrome → browser
  const ext = typeof browser !== "undefined" ? browser : chrome;

  if (document.getElementById("lok-overlay")) return;

  const state = { clipStart: null, clipEnd: null };

  function getVideo() { return document.querySelector("video"); }

  function formatTime(sec) {
    if (sec === null || sec === undefined) return "--:--";
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function secToHMS(sec) {
    if (sec === null) return "00:00:00";
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function getVideoUrl() { return window.location.href.split("&")[0]; }

  function buildClipUrl() {
    return state.clipStart !== null ? `${getVideoUrl()}&t=${Math.floor(state.clipStart)}` : getVideoUrl();
  }

  function copyToClipboard(text) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  }

  function showStatus(el, msg, ok = true) {
    el.textContent = msg;
    el.style.color = ok ? "#4ade80" : "#f87171";
    setTimeout(() => { el.textContent = ""; }, 3000);
  }

  function buildOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "lok-overlay";
    overlay.innerHTML = `
      <div id="lok-header">
        <span id="lok-title">LOK</span>
        <button id="lok-toggle" title="Réduire">−</button>
      </div>
      <div id="lok-body">
        <div id="lok-clip-row">
          <button class="lok-btn lok-sm" id="lok-set-start">▶ Début</button>
          <span id="lok-times">--:-- → --:--</span>
          <button class="lok-btn lok-sm" id="lok-set-end">⏹ Fin</button>
        </div>
        <div id="lok-actions">
          <button class="lok-btn" id="lok-dl-clip">⬇ Clip</button>
          <button class="lok-btn" id="lok-dl-full">⬇ Vidéo</button>
          <button class="lok-btn" id="lok-copy-clip">📋 Clip URL</button>
          <button class="lok-btn" id="lok-copy-full">📋 URL</button>
        </div>
        <div id="lok-status"></div>
      </div>
    `;
    return overlay;
  }

  function injectStyles() {
    if (document.getElementById("lok-styles")) return;
    const style = document.createElement("style");
    style.id = "lok-styles";
    style.textContent = `
      #lok-overlay { position:absolute;top:12px;right:12px;z-index:9999;background:rgba(15,15,15,.92);border:1px solid #333;border-radius:8px;font-family:'Segoe UI',sans-serif;font-size:12px;color:#e5e5e5;min-width:200px;backdrop-filter:blur(4px);user-select:none; }
      #lok-header { display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid #333;cursor:move; }
      #lok-title { font-weight:700;font-size:13px;letter-spacing:1px;color:#a78bfa; }
      #lok-toggle { background:none;border:none;color:#888;cursor:pointer;font-size:16px;line-height:1;padding:0 2px; }
      #lok-toggle:hover { color:#fff; }
      #lok-body { padding:8px 10px; }
      #lok-clip-row { display:flex;align-items:center;gap:6px;margin-bottom:8px; }
      #lok-times { flex:1;text-align:center;font-size:11px;color:#aaa;font-variant-numeric:tabular-nums; }
      #lok-actions { display:grid;grid-template-columns:1fr 1fr;gap:5px; }
      .lok-btn { background:#1e1e2e;border:1px solid #444;border-radius:5px;color:#e5e5e5;cursor:pointer;font-size:11px;padding:5px 4px;transition:background .15s;white-space:nowrap; }
      .lok-btn:hover { background:#2d2d44;border-color:#a78bfa; }
      .lok-sm { padding:4px 7px; }
      #lok-status { margin-top:6px;min-height:14px;font-size:11px;text-align:center; }
      #lok-overlay.lok-collapsed #lok-body { display:none; }
    `;
    document.head.appendChild(style);
  }

  function updateTimesDisplay(overlay) {
    overlay.querySelector("#lok-times").textContent =
      `${formatTime(state.clipStart)} → ${formatTime(state.clipEnd)}`;
  }

  function makeDraggable(overlay) {
    const header = overlay.querySelector("#lok-header");
    let dx = 0, dy = 0, mx = 0, my = 0;
    header.addEventListener("mousedown", (e) => {
      e.preventDefault(); mx = e.clientX; my = e.clientY;
      document.addEventListener("mousemove", onDrag);
      document.addEventListener("mouseup", stopDrag);
    });
    function onDrag(e) {
      dx = mx - e.clientX; dy = my - e.clientY; mx = e.clientX; my = e.clientY;
      overlay.style.top = (overlay.offsetTop - dy) + "px";
      overlay.style.right = "auto";
      overlay.style.left = (overlay.offsetLeft - dx) + "px";
    }
    function stopDrag() {
      document.removeEventListener("mousemove", onDrag);
      document.removeEventListener("mouseup", stopDrag);
    }
  }

  function attachEvents(overlay) {
    const status = overlay.querySelector("#lok-status");

    overlay.querySelector("#lok-toggle").addEventListener("click", () => {
      overlay.classList.toggle("lok-collapsed");
      overlay.querySelector("#lok-toggle").textContent =
        overlay.classList.contains("lok-collapsed") ? "+" : "−";
    });

    overlay.querySelector("#lok-set-start").addEventListener("click", () => {
      const v = getVideo();
      if (!v) { showStatus(status, "Player non détecté", false); return; }
      state.clipStart = v.currentTime;
      updateTimesDisplay(overlay);
      ext.storage.session.set({ lokClipStart: state.clipStart });
    });

    overlay.querySelector("#lok-set-end").addEventListener("click", () => {
      const v = getVideo();
      if (!v) { showStatus(status, "Player non détecté", false); return; }
      state.clipEnd = v.currentTime;
      updateTimesDisplay(overlay);
      ext.storage.session.set({ lokClipEnd: state.clipEnd });
    });

    overlay.querySelector("#lok-dl-full").addEventListener("click", () => {
      showStatus(status, "Téléchargement lancé…");
      ext.runtime.sendMessage({ action: "download_full", url: getVideoUrl() }, (r) => {
        showStatus(status, r?.status === "ok" ? "Lancé !" : (r?.message || "Erreur"), r?.status === "ok");
      });
    });

    overlay.querySelector("#lok-dl-clip").addEventListener("click", () => {
      if (state.clipStart === null || state.clipEnd === null) {
        showStatus(status, "Définissez début et fin", false); return;
      }
      if (state.clipEnd <= state.clipStart) {
        showStatus(status, "Fin doit être > Début", false); return;
      }
      showStatus(status, "Clip lancé…");
      ext.runtime.sendMessage({
        action: "download_clip", url: getVideoUrl(),
        start: secToHMS(state.clipStart), end: secToHMS(state.clipEnd)
      }, (r) => {
        showStatus(status, r?.status === "ok" ? "Clip lancé !" : (r?.message || "Erreur"), r?.status === "ok");
      });
    });

    overlay.querySelector("#lok-copy-full").addEventListener("click", () => {
      copyToClipboard(getVideoUrl()); showStatus(status, "URL copiée !");
    });

    overlay.querySelector("#lok-copy-clip").addEventListener("click", () => {
      copyToClipboard(buildClipUrl()); showStatus(status, "URL clip copiée !");
    });
  }

  function inject() {
    const player = document.querySelector("#movie_player, .html5-video-container");
    if (!player || document.getElementById("lok-overlay")) return;
    injectStyles();
    const overlay = buildOverlay();
    player.style.position = "relative";
    player.appendChild(overlay);
    makeDraggable(overlay);
    attachEvents(overlay);
    ext.storage.session.get(["lokClipStart", "lokClipEnd"]).then((d) => {
      if (d.lokClipStart !== undefined) state.clipStart = d.lokClipStart;
      if (d.lokClipEnd   !== undefined) state.clipEnd   = d.lokClipEnd;
      updateTimesDisplay(overlay);
    });
  }

  ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "get_time") {
      const v = getVideo();
      sendResponse({ time: v ? v.currentTime : null });
      return true;
    }
  });

  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      state.clipStart = null; state.clipEnd = null;
      const old = document.getElementById("lok-overlay");
      if (old) old.remove();
    }
    inject();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  inject();
})();
