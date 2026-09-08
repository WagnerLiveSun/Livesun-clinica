@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Instalando LiveSun Clinicas...
if not exist "config" mkdir "config"
if not exist "storage" mkdir "storage"
if not exist "logs" mkdir "logs"
if not exist ".env" (
  copy /Y "config\local.env.template" ".env" >nul
  echo.
  echo O arquivo .env foi criado.
  echo Preencha as chaves e a conexao MySQL antes de iniciar.
  notepad ".env"
  pause
)
if not exist "LiveSunClinicas.exe" if not exist "dist\LiveSunClinicas.exe" (
  echo [ERRO] LiveSunClinicas.exe nao foi encontrado.
  echo Copie o executavel para esta pasta e tente novamente.
  pause
  exit /b 1
)
echo Estrutura local pronta.
exit /b 0
