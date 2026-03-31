#!/bin/bash
# install.sh — Installe le native messaging host pour LOK extension

set -e

NATIVE_DIR="$HOME/.mozilla/native-messaging-hosts"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[LOK] Vérification de yt-dlp..."
if ! command -v yt-dlp &>/dev/null; then
  echo "[!] yt-dlp non trouvé. Installation..."
  pip install -U yt-dlp || { echo "[ERREUR] Impossible d'installer yt-dlp"; exit 1; }
fi
echo "[OK] yt-dlp : $(yt-dlp --version)"

echo "[LOK] Création du dossier native messaging..."
mkdir -p "$NATIVE_DIR"

echo "[LOK] Copie du host..."
cp "$SCRIPT_DIR/lok_host.py" "$NATIVE_DIR/lok_host.py"
chmod +x "$NATIVE_DIR/lok_host.py"

echo "[LOK] Installation du manifeste..."
# Met à jour le chemin absolu dans le manifeste
sed "s|/home/yanis/.mozilla/native-messaging-hosts/lok_host.py|$NATIVE_DIR/lok_host.py|g" \
  "$SCRIPT_DIR/com.lok.extension.json" > "$NATIVE_DIR/com.lok.extension.json"

echo ""
echo "✓ LOK native host installé dans : $NATIVE_DIR"
echo "✓ Rechargez l'extension dans about:debugging"
