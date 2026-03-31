@echo off
REM install_chrome_windows.bat — Installe le native messaging host LOK pour Chrome sur Windows

setlocal EnableDelayedExpansion

set SCRIPT_DIR=%~dp0
set NATIVE_DIR=%APPDATA%\Google\Chrome\User Data\NativeMessagingHosts
set YTDLP_EXE=%NATIVE_DIR%\yt-dlp.exe

echo [LOK] Verification de Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Python introuvable. Installez Python 3 depuis https://python.org
    echo          Cochez bien "Add Python to PATH" pendant l'installation.
    pause & exit /b 1
)
echo [OK] Python detecte.

echo [LOK] Creation du dossier native messaging...
if not exist "%NATIVE_DIR%" mkdir "%NATIVE_DIR%"

REM ── Installation de yt-dlp ─────────────────────────────────────────────────

echo [LOK] Verification de yt-dlp...
yt-dlp --version >nul 2>&1
if not errorlevel 1 goto ytdlp_ok

echo [LOK] Tentative via python -m pip...
python -m pip install -U yt-dlp >nul 2>&1
if not errorlevel 1 goto ytdlp_ok

echo [LOK] pip indisponible — telechargement direct de yt-dlp.exe...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile '%YTDLP_EXE%'" >nul 2>&1
if exist "%YTDLP_EXE%" (
    echo [OK] yt-dlp.exe telecharge dans %NATIVE_DIR%
    set PATH=%NATIVE_DIR%;%PATH%
    goto ytdlp_ok
)

echo [ERREUR] Impossible d'installer yt-dlp.
echo          Telechargez manuellement yt-dlp.exe depuis https://github.com/yt-dlp/yt-dlp/releases
pause & exit /b 1

:ytdlp_ok
echo [OK] yt-dlp disponible.

ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo [!] ffmpeg non detecte. Recommande pour la meilleure qualite video.
)

REM ── Copie du host ──────────────────────────────────────────────────────────

echo [LOK] Copie du host Python...
copy /Y "%SCRIPT_DIR%lok_host.py" "%NATIVE_DIR%\lok_host.py" >nul

(
echo @echo off
echo python "%NATIVE_DIR%\lok_host.py" %%*
) > "%NATIVE_DIR%\lok_host.bat"

REM ── ID de l'extension ─────────────────────────────────────────────────────

echo.
echo =====================================================
echo   ETAPE — ID de l'extension Chrome
echo =====================================================
echo.
echo   1. Ouvrez chrome://extensions
echo   2. Activez "Mode developpeur" (en haut a droite)
echo   3. Cliquez "Charger l'extension non empaquetee"
echo      Selectionnez le dossier "chrome/"
echo   4. Copiez l'ID affiche sous l'extension (32 lettres)
echo.
set /p EXT_ID="   Collez l'ID ici : "

if "%EXT_ID%"=="" (
    echo [ERREUR] ID vide.
    pause & exit /b 1
)

REM ── Manifeste native messaging ─────────────────────────────────────────────

(
echo {
echo   "name": "com.lok.extension",
echo   "description": "LOK extension native messaging host",
echo   "path": "%NATIVE_DIR%\lok_host.bat",
echo   "type": "stdio",
echo   "allowed_origins": ["chrome-extension://%EXT_ID%/"]
echo }
) > "%NATIVE_DIR%\com.lok.extension.json"

REM ── Registre Windows ──────────────────────────────────────────────────────

echo [LOK] Enregistrement dans le registre...
reg add "HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.lok.extension" /ve /t REG_SZ /d "%NATIVE_DIR%\com.lok.extension.json" /f >nul

echo.
echo  ✓ LOK installe avec succes pour Chrome !
echo  ✓ Rechargez l'extension : chrome://extensions
echo.
pause
