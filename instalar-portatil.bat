@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Instalando LiveSun Clinicas (versao portatil)...
echo.

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado.
    echo Por favor, instale o Node.js 20 ou superior de https://nodejs.org/
    pause
    exit /b 1
)

:: Exibir versao do Node
echo Node.js encontrado:
node --version
echo.

:: Criar estrutura de diretorios
if not exist "config" mkdir "config"
if not exist "storage" mkdir "storage"
if not exist "logs" mkdir "logs"
if not exist "database" mkdir "database"

:: Copiar arquivos necessarios
if not exist "database\sunset_schema_mysql.sql" (
    echo [ERRO] Arquivo database\sunset_schema_mysql.sql nao encontrado.
    pause
    exit /b 1
)

if not exist "config\local.env.template" (
    echo [ERRO] Arquivo config\local.env.template nao encontrado.
    pause
    exit /b 1
)

:: Criar .env se nao existir
if not exist ".env" (
    copy /Y "config\local.env.template" ".env" >nul
    echo.
    echo O arquivo .env foi criado.
    echo Preencha as chaves e a conexao MySQL antes de iniciar.
    echo.
    notepad ".env"
    echo.
    echo Após configurar o .env, execute iniciar-portatil.bat
    pause
    exit /b 0
)

:: Verificar se o build existe
if not exist "dist\index.js" (
    echo [ERRO] Build nao encontrado. Execute 'pnpm run build' primeiro.
    pause
    exit /b 1
)

echo.
echo Estrutura local pronta.
echo.
echo === PROXIMOS PASSOS ===
echo 1. Configure o arquivo .env com suas credenciais MySQL
echo 2. Execute verificar-mysql.bat para verificar a instalacao do MySQL
echo 3. Se o MySQL estiver instalado, execute criar-banco.bat para criar o banco
echo 4. Execute iniciar-portatil.bat para iniciar o sistema
echo.
echo Nota: Se voce nao tem MySQL instalado, baixe em:
echo https://dev.mysql.com/downloads/installer/
echo.
pause