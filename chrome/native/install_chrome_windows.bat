@echo off
REM install_chrome_windows.bat — Installe le native messaging host LOK pour Chrome sur Windows

setlocal

set SCRIPT_DIR=%~dp0
set NATIVE_DIR=%APPDATA%\Google\Chrome\User Data\NativeMessagingHosts

echo [LOK] Verification de Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Python introuvable. Installez Python 3 depuis python.org
    pause & exit /b 1
)

echo [LOK] Verification de yt-dlp...
yt-dlp --version >nul 2>&1
if errorlevel 1 (
    echo [LOK] Installation de yt-dlp...
    pip install -U yt-dlp
)

echo [LOK] Creation du dossier native messaging...
if not exist "%NATIVE_DIR%" mkdir "%NATIVE_DIR%"

echo [LOK] Copie du host...
copy /Y "%SCRIPT_DIR%lok_host.py" "%NATIVE_DIR%\lok_host.py"

echo [LOK] Creation du wrapper .bat pour Chrome...
(
echo @echo off
echo python "%NATIVE_DIR%\lok_host.py" %%*
) > "%NATIVE_DIR%\lok_host.bat"

echo.
echo =====================================================
echo   ETAPE IMPORTANTE — ID de l'extension Chrome
echo =====================================================
echo.
echo   1. Ouvrez chrome://extensions
echo   2. Activez "Mode developpeur"
echo   3. Cliquez "Charger l'extension non empaquetee"
echo      Selectionnez le dossier "chrome/"
echo   4. Copiez l'ID affiche sous l'extension
echo.
set /p EXT_ID="   Collez l'ID ici : "

if "%EXT_ID%"=="" (
    echo [ERREUR] ID vide, abandon.
    pause & exit /b 1
)

echo [LOK] Ecriture du manifeste...
(
echo {
echo   "name": "com.lok.extension",
echo   "description": "LOK extension native messaging host",
echo   "path": "%NATIVE_DIR%\lok_host.bat",
echo   "type": "stdio",
echo   "allowed_origins": ["chrome-extension://%EXT_ID%/"]
echo }
) > "%NATIVE_DIR%\com.lok.extension.json"

echo [LOK] Enregistrement dans le registre Windows...
reg add "HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.lok.extension" /ve /t REG_SZ /d "%NATIVE_DIR%\com.lok.extension.json" /f

echo.
echo  LOK installe pour Chrome !
echo  Rechargez l'extension dans chrome://extensions
echo.
pause
