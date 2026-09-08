@echo off
title LiveSun Clinicas
setlocal EnableExtensions
cd /d "%~dp0"

:: Tenta minimizar a janela do console
if "%1"=="minimized" goto start
start "" /min cmd /c "%~f0" minimized
exit /b

:start
:: Verificar se .env existe
if not exist ".env" (
    echo [CONFIGURACAO NECESSARIA]
    echo.
    echo Executando instalacao inicial...
    call instalar-portatil.bat
    if %errorlevel% neq 0 (
        pause
        exit /b 1
    )
)

:: Verificar se o build existe
if not exist "dist\index.js" (
    echo [ERRO] Build nao encontrado.
    echo.
    echo Por favor, execute 'pnpm run build' primeiro
    echo ou contate o suporte tecnico.
    pause
    exit /b 1
)

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado.
    echo.
    echo O LiveSun Clinicas requer Node.js 20 ou superior.
    echo.
    echo 1. Baixe Node.js em: https://nodejs.org/
    echo 2. Instale a versao LTS recomendada
    echo 3. Execute este programa novamente
    echo.
    pause
    exit /b 1
)

:: Verificar MySQL
echo [VERIFICANDO MySQL]
where mysql >nul 2>&1
if %errorlevel% neq 0 (
    echo MySQL nao encontrado no PATH.
    echo Verificando instalacoes padrao...
    
    if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
        echo [OK] MySQL 8.0 encontrado
    ) else if exist "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe" (
        echo [OK] MySQL 9.0 encontrado
    ) else (
        echo [AVISO] MySQL nao encontrado.
        echo.
        echo O sistema funcionara, mas precisara do MySQL
        echo para criar o banco de dados.
        echo.
        echo Execute verificar-mysql.bat para mais detalhes.
        echo.
    )
)

:: Mostrar status
echo.
echo ========================================
echo   LiveSun Clinicas
echo   Iniciando servidor...
echo ========================================
echo.
echo Acesse: http://localhost:3000
echo.
echo Pressione Ctrl+C para parar o servidor
echo.
echo ========================================
echo.

:: Aguardar servidor iniciar e abrir navegador
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000/" >nul 2>&1

:: Iniciar o servidor
set NODE_ENV=production
node dist/index.js

:: Se o servidor parar, mostrar mensagem
echo.
echo ========================================
echo   Servidor LiveSun Clinicas parado
echo ========================================
echo.
echo Para reiniciar, execute este programa novamente.
echo.
pause