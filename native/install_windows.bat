@echo off
REM install_windows.bat — Installe le native messaging host LOK sur Windows
REM Lancer en tant qu'administrateur si python n'est pas dans le PATH

setlocal

set SCRIPT_DIR=%~dp0
set NATIVE_DIR=%APPDATA%\Mozilla\NativeMessagingHosts

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
    if errorlevel 1 (
        echo [ERREUR] Impossible d'installer yt-dlp
        pause & exit /b 1
    )
)

echo [LOK] Creation du dossier native messaging...
if not exist "%NATIVE_DIR%" mkdir "%NATIVE_DIR%"

echo [LOK] Copie du host...
copy /Y "%SCRIPT_DIR%lok_host.py" "%NATIVE_DIR%\lok_host.py"

echo [LOK] Creation du manifeste...
(
echo {
echo   "name": "com.lok.extension",
echo   "description": "LOK extension native messaging host",
echo   "path": "%NATIVE_DIR%\lok_host.py",
echo   "type": "stdio",
echo   "allowed_extensions": ["lok-extension@lok"]
echo }
) > "%NATIVE_DIR%\com.lok.extension.json"

echo [LOK] Creation du wrapper .bat pour Firefox...
(
echo @echo off
echo python "%NATIVE_DIR%\lok_host.py" %%*
) > "%NATIVE_DIR%\lok_host.bat"

REM Firefox sur Windows n'execute pas .py directement — on passe par le .bat
REM On met a jour le manifeste pour pointer vers le .bat
(
echo {
echo   "name": "com.lok.extension",
echo   "description": "LOK extension native messaging host",
echo   "path": "%NATIVE_DIR%\lok_host.bat",
echo   "type": "stdio",
echo   "allowed_extensions": ["lok-extension@lok"]
echo }
) > "%NATIVE_DIR%\com.lok.extension.json"

echo [LOK] Enregistrement dans le registre Windows...
reg add "HKCU\SOFTWARE\Mozilla\NativeMessagingHosts\com.lok.extension" /ve /t REG_SZ /d "%NATIVE_DIR%\com.lok.extension.json" /f

echo.
echo  LOK native host installe avec succes !
echo  Rechargez l'extension dans Firefox : about:debugging
echo.
pause
