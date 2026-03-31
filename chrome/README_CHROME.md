# LOK Extension — Chrome

> Dossier `chrome/` — version Manifest V3 pour Google Chrome et Chromium

## Installation Linux

```bash
cd native/
chmod +x install_chrome_linux.sh
./install_chrome_linux.sh
```

Le script demande l'ID de l'extension (à copier depuis `chrome://extensions` après chargement).

## Installation Windows

1. Charger l'extension dans Chrome (`chrome://extensions` → Mode développeur → Charger non empaquetée → dossier `chrome/`)
2. Copier l'ID affiché
3. Double-cliquer `native/install_chrome_windows.bat` et coller l'ID

## Différences avec la version Firefox

| | Firefox | Chrome |
|---|---|---|
| Manifest | V2 | V3 |
| Background | Script persistant | Service Worker |
| API | `browser.*` | `chrome.*` |
| Native messaging | `allowed_extensions` | `allowed_origins` + ID requis |
| Installation | `install.sh` | `install_chrome_linux.sh` |
