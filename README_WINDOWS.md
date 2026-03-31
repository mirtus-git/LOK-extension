# LOK Extension — Installation Windows

Extension Firefox pour télécharger et clipper des vidéos YouTube, et copier des médias (images/vidéos) depuis n'importe quel site vers Premiere Pro ou tout autre logiciel.

## Prérequis

### Python 3
Télécharger sur [python.org](https://www.python.org/downloads/)
> Cocher **"Add Python to PATH"** pendant l'installation

### yt-dlp
```cmd
pip install -U yt-dlp
```

### ffmpeg
1. Télécharger sur [ffmpeg.org](https://ffmpeg.org/download.html) (build Windows)
2. Extraire et ajouter le dossier `bin/` au PATH Windows
3. Vérifier : `ffmpeg -version` dans un terminal

## Installation

### 1. Installer le native messaging host

Dans le dossier `native/`, **double-cliquer** sur `install_windows.bat`

> Si Windows bloque l'exécution : clic droit → "Exécuter en tant qu'administrateur"

Le script :
- Copie `lok_host.py` dans `%APPDATA%\Mozilla\NativeMessagingHosts\`
- Crée le manifeste et l'enregistre dans le registre Windows
- Crée un wrapper `.bat` pour que Firefox puisse lancer Python

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
- Les fichiers arrivent dans `C:\Users\<nom>\Downloads\` en MP4 (H.264 + AAC)

### Copier un média vers Premiere Pro (clic droit)
- **Clic droit sur une image** → "📋 Copier l'image (LOK)"
- **Clic droit sur une vidéo** → "📋 Copier la vidéo (LOK)"
- Fonctionne sur YouTube, Instagram, Twitter/X, TikTok, Vimeo, et 1000+ sites
- La barre de progression s'affiche dans le popup
- Quand c'est prêt : **"Prêt à coller !"**
- Faire **Ctrl+V** dans Premiere Pro (panneau Projet) pour importer le média

### Copier l'URL
- **📋 Copier URL** — copie l'URL YouTube propre
- **📋 Copier URL clip** — copie l'URL avec timestamp (`?t=XX`)

### Téléchargements parallèles
- Boutons **−** / **+** en bas du popup
- Réglable de 1 à 16 connexions (défaut : 4)

## Coller dans Premiere Pro

1. Copier un média via clic droit → "📋 Copier (LOK)"
2. Attendre "Prêt à coller !" dans la barre de progression
3. Dans Premiere Pro : cliquer dans le **panneau Projet** → `Ctrl+V`

Le fichier est importé directement dans votre projet.

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
    ├── lok_host.py              ← script Python (yt-dlp wrapper)
    ├── install_windows.bat      ← installateur Windows
    └── com.lok.extension.win.json
```

## Dépannage

| Problème | Solution |
|---|---|
| "Native host inaccessible" | Relancer `install_windows.bat` en administrateur |
| Vidéo illisible | Vérifier que ffmpeg est dans le PATH |
| yt-dlp introuvable | `pip install yt-dlp` puis redémarrer Firefox |
| Paste ne fonctionne pas dans Premiere Pro | Cliquer dans le panneau Projet avant Ctrl+V |
