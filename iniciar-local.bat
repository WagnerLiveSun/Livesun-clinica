@echo off
setlocal EnableExtensions
title SunSet - Inicializacao Local
cd /d "%~dp0"

echo.
echo ================================================
echo   SunSet - Inicializacao local
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js 20 ou superior nao foi encontrado.
  echo Instale em https://nodejs.org/ e execute este arquivo novamente.
  pause
  exit /b 1
)

where corepack >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Corepack nao foi encontrado junto ao Node.js.
  echo Instale o Node.js 20 ou superior e execute novamente.
  pause
  exit /b 1
)

if not exist ".env" (
  echo Criando .env a partir de config\local.env.template...
  copy /Y "config\local.env.template" ".env" >nul
  echo.
  echo [ATENCAO] Edite o arquivo .env e informe DATABASE_URL e JWT_SECRET.
  echo Depois, execute iniciar-local.bat novamente.
  notepad ".env"
  pause
  exit /b 0
)

findstr /C:"USUARIO:SENHA" ".env" >nul
if not errorlevel 1 (
  echo [ERRO] DATABASE_URL ainda nao foi configurada no arquivo .env.
  notepad ".env"
  pause
  exit /b 1
)

echo Ativando o gerenciador de pacotes...
where pnpm >nul 2>nul
if not errorlevel 1 goto :pnpm_ok

echo pnpm nao encontrado no PATH. Usando corepack (sem "enable", que exige privilegio de administrador)...
set PNPM=corepack pnpm
goto :deps

:pnpm_ok
set PNPM=pnpm

:deps
echo Instalando dependencias do projeto...
call %PNPM% install --frozen-lockfile
if errorlevel 1 goto :erro

echo.
echo Iniciando o SunSet em http://localhost:3000
echo Para encerrar, pressione Ctrl+C nesta janela.
echo.
set NODE_ENV=development
call %PNPM% exec tsx watch server/_core/index.ts
goto :fim

:erro
echo.
echo [ERRO] Nao foi possivel preparar ou iniciar o SunSet.
echo Verifique a conexao com a internet, o arquivo .env e o MySQL.
pause
exit /b 1

:fim
endlocal
