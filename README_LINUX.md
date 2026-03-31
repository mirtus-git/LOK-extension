# LOK Extension — Installation Linux

Extension Firefox pour télécharger et clipper des vidéos YouTube, et copier des médias (images/vidéos) depuis n'importe quel site.

## Prérequis

```bash
# yt-dlp
pip install -U yt-dlp

# ffmpeg (fusion vidéo+audio)
sudo apt install ffmpeg

# xclip (fonction copier vers presse-papier)
sudo apt install xclip
```

## Installation

### 1. Installer le native messaging host

```bash
cd native/
chmod +x install.sh
./install.sh
```

### 2. Charger l'extension dans Firefox

1. Ouvrir `about:debugging`
2. Cliquer **"Ce Firefox"**
3. Cliquer **"Charger un module temporaire…"**
4. Sélectionner le fichier `manifest.json` à la racine du projet

L'icône **LOK** apparaît dans la barre d'outils Firefox.

## Fonctionnalités

### Téléchargement YouTube (popup)
- Cliquer sur l'icône LOK sur une page YouTube
- **▶ Début / ⏹ Fin** — définir la plage du clip
- **⬇ Télécharger clip** — télécharge la portion sélectionnée
- **⬇ Télécharger vidéo** — télécharge la vidéo complète
- Les fichiers arrivent dans `~/Downloads/` en MP4 (H.264 + AAC)

### Copier un média (clic droit)
- **Clic droit sur une image** → "📋 Copier l'image (LOK)"
- **Clic droit sur une vidéo** → "📋 Copier la vidéo (LOK)"
- Fonctionne sur YouTube, Instagram, Twitter/X, TikTok, Vimeo, et 1000+ sites
- La barre de progression s'affiche dans le popup
- Quand c'est prêt : **"Prêt à coller !"**

### Copier l'URL
- **📋 Copier URL** — copie l'URL YouTube propre
- **📋 Copier URL clip** — copie l'URL avec timestamp (`?t=XX`)

### Téléchargements parallèles
- Boutons **−** / **+** en bas du popup
- Réglable de 1 à 16 connexions (défaut : 4)

## Structure des fichiers

```
LOK-extension/
├── manifest.json
├── background.js
├── content.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── icons/
└── native/
    ├── lok_host.py        ← script Python (yt-dlp wrapper)
    ├── install.sh         ← installateur Linux
    └── com.lok.extension.json
```
