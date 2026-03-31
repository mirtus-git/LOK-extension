#!/usr/bin/env python3
# lok_host.py — Native Messaging Host pour LOK extension
# Compatible Windows et Linux

import sys
import json
import struct
import subprocess
import os
import shutil
import threading
import re
import platform
import tempfile
import urllib.request

OS = platform.system()  # 'Windows' | 'Linux' | 'Darwin'

# ── Protocole Native Messaging ────────────────────────────────────────────────

stdout_lock = threading.Lock()

def read_message():
    raw_len = sys.stdin.buffer.read(4)
    if len(raw_len) < 4:
        return None
    msg_len = struct.unpack("<I", raw_len)[0]
    data = sys.stdin.buffer.read(msg_len)
    return json.loads(data.decode("utf-8"))

def send_message(msg):
    data = json.dumps(msg).encode("utf-8")
    with stdout_lock:
        sys.stdout.buffer.write(struct.pack("<I", len(data)))
        sys.stdout.buffer.write(data)
        sys.stdout.buffer.flush()

# ── Helpers ───────────────────────────────────────────────────────────────────

def find_ytdlp():
    for name in ("yt-dlp", "yt_dlp", "yt-dlp.exe"):
        path = shutil.which(name)
        if path:
            return path
    return None

def has_ffmpeg():
    return shutil.which("ffmpeg") is not None or shutil.which("ffmpeg.exe") is not None

def downloads_dir():
    if OS == "Windows":
        return os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\User"), "Downloads")
    return os.path.expanduser("~/Downloads")

def temp_dir():
    path = os.path.join(tempfile.gettempdir(), "lok_media")
    os.makedirs(path, exist_ok=True)
    return path

# ── Presse-papier (cross-platform) ───────────────────────────────────────────

def copy_file_to_clipboard(path):
    """Met un fichier dans le presse-papier pour Ctrl+V dans Premiere Pro / Explorer."""
    if OS == "Windows":
        _clipboard_windows(path)
    else:
        _clipboard_linux(path)

def _clipboard_windows(path):
    ps = (
        "Add-Type -AssemblyName System.Windows.Forms; "
        "$col = New-Object System.Collections.Specialized.StringCollection; "
        f'$col.Add("{path}"); '
        "[System.Windows.Forms.Clipboard]::SetFileDropList($col)"
    )
    subprocess.run(
        ["powershell", "-NonInteractive", "-Command", ps],
        check=True, timeout=15,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )

def _clipboard_linux(path):
    """xclip avec text/uri-list — fonctionne avec Nautilus, certains apps."""
    uri = f"file://{path}\n"
    # Essai xclip puis xsel
    for cmd in (
        ["xclip", "-selection", "clipboard", "-t", "text/uri-list"],
        ["xsel", "--clipboard", "--input"],
    ):
        if shutil.which(cmd[0]):
            subprocess.run(cmd, input=uri.encode(), check=True, timeout=5)
            return
    raise RuntimeError("xclip ou xsel requis sur Linux pour la fonction copier")

# ── Progression yt-dlp ────────────────────────────────────────────────────────

RE_PROGRESS = re.compile(
    r'\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+\S*)'
    r'(?:\s+at\s+([\d.]+\S*))?(?:\s+ETA\s+(\S+))?'
)
RE_DEST   = re.compile(r'\[download\] Destination:\s*(.+)')
RE_MERGER = re.compile(r'\[Merger\]|\[ffmpeg\]')
RE_DONE   = re.compile(r'\[download\] 100%')

def run_with_progress(cmd, msg_id, on_done_path=False):
    """Lance yt-dlp, parse la progression, appelle on_done_path(path) si fourni."""
    phase      = 0
    phase_name = ["vidéo", "audio"]
    dest_path  = [None]

    proc = subprocess.Popen(
        cmd,
        stderr=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
        text=True, bufsize=1
    )

    for line in proc.stderr:
        line = line.strip()

        m_dest = RE_DEST.search(line)
        if m_dest:
            dest_path[0] = m_dest.group(1).strip()
            send_message({
                "type": "progress", "id": msg_id,
                "percent": 0, "speed": "", "eta": "",
                "phase": phase_name[min(phase, 1)], "status": "downloading"
            })

        m = RE_PROGRESS.search(line)
        if m:
            send_message({
                "type": "progress", "id": msg_id,
                "percent": float(m.group(1)),
                "size":  m.group(2) or "",
                "speed": m.group(3) or "",
                "eta":   m.group(4) or "",
                "phase": phase_name[min(phase, 1)],
                "status": "downloading"
            })

        if RE_DONE.search(line):
            phase += 1

        if RE_MERGER.search(line):
            send_message({
                "type": "progress", "id": msg_id,
                "percent": 99, "speed": "", "eta": "",
                "phase": "fusion", "status": "merging"
            })

    proc.wait()

    if proc.returncode == 0:
        if on_done_path and dest_path[0]:
            try:
                copy_file_to_clipboard(dest_path[0])
                send_message({"type": "progress", "id": msg_id,
                              "percent": 100, "phase": "prêt à coller !", "status": "ready"})
            except Exception as e:
                send_message({"type": "progress", "id": msg_id,
                              "percent": 100, "phase": "terminé (clipboard échoué)", "status": "done",
                              "message": str(e)})
        else:
            send_message({"type": "progress", "id": msg_id,
                          "percent": 100, "phase": "terminé", "status": "done"})
    else:
        send_message({"type": "progress", "id": msg_id,
                      "status": "error", "message": "Erreur yt-dlp (code %d)" % proc.returncode})

# ── Commandes de téléchargement ───────────────────────────────────────────────

def _video_args_for(url, out_tmpl, n, extra=None):
    base = [
        find_ytdlp(), "--newline", "--progress",
        "-f", ("bestvideo[vcodec^=avc1]+bestaudio[acodec^=mp4a]"
               "/bestvideo[vcodec^=avc1]+bestaudio"
               "/bestvideo+bestaudio/best"),
        "--merge-output-format", "mp4",
        "--postprocessor-args", "ffmpeg:-c:v copy -c:a aac -b:a 192k",
        "-N", str(n),
    ] if has_ffmpeg() else [
        find_ytdlp(), "--newline", "--progress",
        "-f", "best[ext=mp4]/best",
        "-N", str(n),
    ]
    if extra:
        base += extra
    base += ["-o", out_tmpl, url]
    return base

def handle_download_full(msg_id, url, n):
    out = os.path.join(downloads_dir(), "%(title)s.%(ext)s")
    cmd = _video_args_for(url, out, n)
    threading.Thread(target=run_with_progress, args=(cmd, msg_id), daemon=True).start()
    return {"id": msg_id, "status": "ok", "message": "Téléchargement démarré"}

def handle_download_clip(msg_id, url, start, end, n):
    out     = os.path.join(downloads_dir(), "%(title)s_clip_%(epoch)s.%(ext)s")
    section = f"*{start}-{end}"
    extra   = ["--download-sections", section, "--force-keyframes-at-cuts"]
    cmd     = _video_args_for(url, out, n, extra)
    threading.Thread(target=run_with_progress, args=(cmd, msg_id), daemon=True).start()
    return {"id": msg_id, "status": "ok", "message": "Clip démarré"}

# ── Copier un média (image ou vidéo) ─────────────────────────────────────────

def copy_image_thread(msg_id, url):
    try:
        send_message({"type": "progress", "id": msg_id,
                      "percent": 0, "phase": "téléchargement image", "status": "downloading"})
        # Détermine l'extension depuis l'URL
        clean = url.split("?")[0]
        ext   = clean.rsplit(".", 1)[-1][:5] if "." in clean else "jpg"
        path  = os.path.join(temp_dir(), f"lok_image.{ext}")

        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            with open(path, "wb") as f:
                f.write(resp.read())

        send_message({"type": "progress", "id": msg_id,
                      "percent": 90, "phase": "copie presse-papier", "status": "downloading"})
        copy_file_to_clipboard(path)
        send_message({"type": "progress", "id": msg_id,
                      "percent": 100, "phase": "prêt à coller !", "status": "ready"})
    except Exception as e:
        send_message({"type": "progress", "id": msg_id,
                      "status": "error", "message": str(e)})

def handle_copy_media(msg_id, url, page_url, media_type):
    if media_type == "image":
        threading.Thread(target=copy_image_thread, args=(msg_id, url), daemon=True).start()
    else:
        # Vidéo : yt-dlp sur l'URL (ou la page si blob:)
        dl_url = page_url if (url.startswith("blob:") or not url) else url
        out    = os.path.join(temp_dir(), "lok_video.%(ext)s")
        cmd    = _video_args_for(dl_url, out, 4)
        # on_done_path=True pour déclencher le clipboard après téléchargement
        threading.Thread(
            target=run_with_progress,
            args=(cmd, msg_id),
            kwargs={"on_done_path": True},
            daemon=True
        ).start()
    return {"id": msg_id, "status": "ok", "message": "Copie en cours…"}

# ── Boucle principale ─────────────────────────────────────────────────────────

def main():
    if not find_ytdlp():
        send_message({"type": "error", "message": "yt-dlp introuvable"})
        return

    while True:
        msg = read_message()
        if msg is None:
            break

        action = msg.get("action")
        msg_id = msg.get("id")
        n      = int(msg.get("n", 4))

        try:
            if action == "download_full":
                resp = handle_download_full(msg_id, msg["url"], n)
            elif action == "download_clip":
                resp = handle_download_clip(msg_id, msg["url"], msg["start"], msg["end"], n)
            elif action == "copy_media":
                resp = handle_copy_media(msg_id, msg["url"], msg.get("page_url", ""), msg.get("media_type", "video"))
            else:
                resp = {"id": msg_id, "status": "error", "message": f"Action inconnue : {action}"}
        except Exception as e:
            resp = {"id": msg_id, "status": "error", "message": str(e)}

        send_message(resp)

if __name__ == "__main__":
    main()
