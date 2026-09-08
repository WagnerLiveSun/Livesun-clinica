@echo off
setlocal EnableExtensions
cd /d "%~dp0"

:: Verificar se .env existe
if not exist ".env" (
    echo [ERRO] Arquivo .env nao encontrado.
    echo Execute instalar-portatil.bat primeiro.
    pause
    exit /b 1
)

:: Verificar se o build existe
if not exist "dist\index.js" (
    echo [ERRO] Build nao encontrado.
    echo Execute 'pnpm run build' primeiro.
    pause
    exit /b 1
)

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado.
    echo Por favor, instale o Node.js 20 ou superior de https://nodejs.org/
    pause
    exit /b 1
)

echo Iniciando LiveSun Clinicas em http://localhost:3000/
echo Pressione Ctrl+C para parar o servidor.
echo.

:: Aguardar um momento e abrir o navegador
start "" "http://localhost:3000/" >nul 2>&1

:: Iniciar o servidor
set NODE_ENV=production
node dist/index.js

endlocal