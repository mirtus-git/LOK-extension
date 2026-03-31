@echo off
REM install_windows.bat — Installe le native messaging host LOK sur Windows (Firefox)

setlocal EnableDelayedExpansion

set SCRIPT_DIR=%~dp0
set NATIVE_DIR=%APPDATA%\Mozilla\NativeMessagingHosts
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

REM Essai 1 : python -m pip (plus fiable que "pip" seul)
echo [LOK] Tentative via python -m pip...
python -m pip install -U yt-dlp >nul 2>&1
if not errorlevel 1 goto ytdlp_ok

REM Essai 2 : telecharger yt-dlp.exe directement depuis GitHub
echo [LOK] pip indisponible — telechargement direct de yt-dlp.exe...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile '%YTDLP_EXE%'" >nul 2>&1
if exist "%YTDLP_EXE%" (
    echo [OK] yt-dlp.exe telecharge dans %NATIVE_DIR%
    set PATH=%NATIVE_DIR%;%PATH%
    goto ytdlp_ok
)

echo [ERREUR] Impossible d'installer yt-dlp.
echo          Telechargez manuellement yt-dlp.exe depuis https://github.com/yt-dlp/yt-dlp/releases
echo          et placez-le dans : %NATIVE_DIR%
pause & exit /b 1

:ytdlp_ok
echo [OK] yt-dlp disponible.

REM ── Installation de ffmpeg ─────────────────────────────────────────────────

ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo [!] ffmpeg non detecte. Recommande pour la meilleure qualite video.
    echo     Telechargez-le sur https://ffmpeg.org/download.html
    echo     et ajoutez le dossier bin/ au PATH Windows.
)

REM ── Copie du host ──────────────────────────────────────────────────────────

echo [LOK] Copie du host Python...
copy /Y "%SCRIPT_DIR%lok_host.py" "%NATIVE_DIR%\lok_host.py" >nul

REM Wrapper .bat : Firefox lance .bat qui appelle Python
(
echo @echo off
echo python "%NATIVE_DIR%\lok_host.py" %%*
) > "%NATIVE_DIR%\lok_host.bat"

REM ── Manifeste native messaging ─────────────────────────────────────────────

(
echo {
echo   "name": "com.lok.extension",
echo   "description": "LOK extension native messaging host",
echo   "path": "%NATIVE_DIR%\lok_host.bat",
echo   "type": "stdio",
echo   "allowed_extensions": ["lok-extension@lok"]
echo }
) > "%NATIVE_DIR%\com.lok.extension.json"

REM ── Registre Windows ──────────────────────────────────────────────────────

echo [LOK] Enregistrement dans le registre...
reg add "HKCU\SOFTWARE\Mozilla\NativeMessagingHosts\com.lok.extension" /ve /t REG_SZ /d "%NATIVE_DIR%\com.lok.extension.json" /f >nul

echo.
echo  ✓ LOK installe avec succes pour Firefox !
echo  ✓ Rechargez l'extension : about:debugging
echo.
pause
