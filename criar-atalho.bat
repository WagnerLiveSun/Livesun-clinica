@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Criando atalho do LiveSun Clinicas...
echo.

:: Criar script PowerShell para criar atalho
set PS_SCRIPT=%TEMP%\create_shortcut.ps1

echo $WshShell = New-Object -ComObject WScript.Shell > "%PS_SCRIPT%"
echo $Shortcut = $WshShell.CreateShortcut("%USERPROFILE%\Desktop\LiveSun Clinicas.lnk") >> "%PS_SCRIPT%"
echo $Shortcut.TargetPath = "%CD%\LiveSunClinicas.bat" >> "%PS_SCRIPT%"
echo $Shortcut.WorkingDirectory = "%CD%" >> "%PS_SCRIPT%"
echo $Shortcut.Description = "Sistema de Gestao para Clinicas" >> "%PS_SCRIPT%"
echo $Shortcut.IconLocation = "%CD%\dist\public\assets\logo-livesun.svg" >> "%PS_SCRIPT%"
echo $Shortcut.Save() >> "%PS_SCRIPT%"

:: Executar script PowerShell
powershell -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

:: Limpar script temporário
del "%PS_SCRIPT%"

echo.
echo [SUCESSO] Atalho criado na area de trabalho!
echo.
echo Agora voce pode:
echo 1. Clicar duas vezes no atalho "LiveSun Clinicas" na area de trabalho
echo 2. Ou executar LiveSunClinicas.bat diretamente
echo.
pause