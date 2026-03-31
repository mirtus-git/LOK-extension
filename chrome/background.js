// background.js — LOK extension (Chrome MV3 Service Worker)

const NATIVE_HOST = "com.lok.extension";

let port = null;
let msgId = 0;
const pendingCallbacks = {};

function connectNative() {
  if (port) return;
  try {
    port = chrome.runtime.connectNative(NATIVE_HOST);
    port.onMessage.addListener(onNativeMessage);
    port.onDisconnect.addListener(() => {
      port = null;
      const err = chrome.runtime.lastError?.message || "Native host déconnecté.";
      for (const id in pendingCallbacks) {
        pendingCallbacks[id]({ status: "error", message: err });
        delete pendingCallbacks[id];
      }
    });
  } catch (e) { port = null; }
}

function onNativeMessage(msg) {
  if (msg.type === "progress" || msg.type === "copy_progress") {
    chrome.storage.session.set({ lokProgress: msg });
    chrome.runtime.sendMessage({ type: "progress", payload: msg }).catch(() => {});
    return;
  }
  if (msg.id && pendingCallbacks[msg.id]) {
    pendingCallbacks[msg.id](msg);
    delete pendingCallbacks[msg.id];
  }
}

function sendToNative(payload) {
  return new Promise((resolve) => {
    connectNative();
    if (!port) {
      resolve({ status: "error", message: "Native host inaccessible. Lancez install_chrome_linux.sh ou install_chrome_windows.bat" });
      return;
    }
    const id = ++msgId;
    payload.id = id;
    pendingCallbacks[id] = resolve;
    port.postMessage(payload);
  });
}

function notify(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon-48.svg"),
    title,
    message
  });
}

// ── Context menus ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "lok-copy-image",
    title: "📋 Copier l'image (LOK)",
    contexts: ["image"]
  });
  chrome.contextMenus.create({
    id: "lok-copy-video",
    title: "📋 Copier la vidéo (LOK)",
    contexts: ["video", "link"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "lok-copy-image") {
    const url = info.srcUrl;
    if (!url) { notify("LOK", "URL image introuvable"); return; }
    notify("LOK", "Copie de l'image en cours…");
    const resp = await sendToNative({ action: "copy_media", url, page_url: info.pageUrl, media_type: "image" });
    if (resp.status !== "ok") notify("LOK — Erreur", resp.message || "Erreur");
  }

  if (info.menuItemId === "lok-copy-video") {
    const src      = info.srcUrl || "";
    const page_url = info.pageUrl || info.linkUrl || "";
    const url      = src.startsWith("blob:") || !src ? page_url : src;
    if (!url) { notify("LOK", "URL vidéo introuvable"); return; }
    notify("LOK", "Copie de la vidéo en cours…");
    const resp = await sendToNative({ action: "copy_media", url, page_url, media_type: "video" });
    if (resp.status !== "ok") notify("LOK — Erreur", resp.message || "Erreur");
  }
});

// ── Messages depuis popup ─────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "download_full") {
    sendToNative({ action: "download_full", url: msg.url, n: msg.n || 4 }).then((r) => {
      if (r.status !== "ok") notify("LOK — Erreur", r.message || "Erreur");
      sendResponse(r);
    });
    return true; // async
  }
  if (msg.action === "download_clip") {
    sendToNative({ action: "download_clip", url: msg.url, start: msg.start, end: msg.end, n: msg.n || 4 }).then((r) => {
      if (r.status !== "ok") notify("LOK — Erreur", r.message || "Erreur");
      sendResponse(r);
    });
    return true;
  }
});
