#!/bin/bash
# install_chrome_linux.sh — Installe le native messaging host LOK pour Chrome/Chromium sur Linux

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Détecte Chrome ou Chromium
if [ -d "$HOME/.config/google-chrome" ]; then
  NATIVE_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
elif [ -d "$HOME/.config/chromium" ]; then
  NATIVE_DIR="$HOME/.config/chromium/NativeMessagingHosts"
else
  NATIVE_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
fi

echo "[LOK] Vérification de yt-dlp..."
if ! command -v yt-dlp &>/dev/null; then
  echo "[LOK] Installation de yt-dlp..."
  pip install -U yt-dlp || { echo "[ERREUR] pip requis"; exit 1; }
fi

echo "[LOK] Vérification de ffmpeg..."
if ! command -v ffmpeg &>/dev/null; then
  echo "[!] ffmpeg non trouvé — sudo apt install ffmpeg recommandé"
fi

echo "[LOK] Création du dossier : $NATIVE_DIR"
mkdir -p "$NATIVE_DIR"

echo "[LOK] Copie du host..."
cp "$SCRIPT_DIR/lok_host.py" "$NATIVE_DIR/lok_host.py"
chmod +x "$NATIVE_DIR/lok_host.py"

echo ""
echo "══════════════════════════════════════════════════════"
echo "  ÉTAPE IMPORTANTE — ID de l'extension"
echo "══════════════════════════════════════════════════════"
echo ""
echo "  1. Chargez l'extension dans Chrome : chrome://extensions"
echo "     → 'Mode développeur' ON"
echo "     → 'Charger l'extension non empaquetée' → dossier chrome/"
echo ""
echo "  2. Copiez l'ID affiché (ex: abcdefghijklmnopqrstuvwxyz123456)"
echo ""
read -rp "  Collez l'ID ici : " EXT_ID

if [ -z "$EXT_ID" ]; then
  echo "[ERREUR] ID vide, abandon."
  exit 1
fi

echo "[LOK] Écriture du manifeste avec l'ID : $EXT_ID"
cat > "$NATIVE_DIR/com.lok.extension.json" <<EOF
{
  "name": "com.lok.extension",
  "description": "LOK extension native messaging host (yt-dlp)",
  "path": "$NATIVE_DIR/lok_host.py",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://${EXT_ID}/"
  ]
}
EOF

echo ""
echo "✓ Installation terminée !"
echo "✓ Rechargez l'extension dans chrome://extensions"
