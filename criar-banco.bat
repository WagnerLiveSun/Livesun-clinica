@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Criando banco de dados Sunset...
echo.

:: Verificar se o arquivo .env existe
if not exist ".env" (
    echo [ERRO] Arquivo .env nao encontrado.
    echo Execute instalar-portatil.bat primeiro.
    pause
    exit /b 1
)

:: Ler DATABASE_URL do .env (simplificado - assume formato padrao)
for /f "tokens=2 delims==" %%a in ('findstr DATABASE_URL .env') do set DB_URL=%%a

:: Extrair usuario e host da URL (formato: mysql://usuario:senha@host:porta/banco)
for /f "tokens=2 delims=@" %%a in ("%DB_URL%") do set HOST_PART=%%a
for /f "tokens=1 delims=:" %%a in ("%HOST_PART%") do set USER_PASS=%%a
for /f "tokens=1 delims=:" %%a in ("%USER_PASS%") do set MYSQL_USER=%%a

:: Tenta encontrar mysql.exe
set MYSQL_CMD=
where mysql >nul 2>&1
if %errorlevel% equ 0 (
    set MYSQL_CMD=mysql
) else (
    :: Verificar caminhos comuns
    if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
        set MYSQL_CMD="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    ) else if exist "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe" (
        set MYSQL_CMD="C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe"
    ) else if exist "C:\MySQL\bin\mysql.exe" (
        set MYSQL_CMD="C:\MySQL\bin\mysql.exe"
    )
)

if "%MYSQL_CMD%"=="" (
    echo [ERRO] MySQL nao encontrado.
    echo Execute verificar-mysql.bat para verificar a instalacao.
    pause
    exit /b 1
)

echo MySQL encontrado: %MYSQL_CMD%
echo.
echo Este script ira:
echo 1. Conectar ao MySQL como usuario %MYSQL_USER%
echo 2. Executar o script database\sunset_schema_mysql.sql
echo 3. Criar as tabelas do sistema
echo.
echo Voce precisara fornecer a senha do MySQL.
echo.
pause

:: Executar o script SQL
%MYSQL_CMD% -u %MYSQL_USER% -p < database\sunset_schema_mysql.sql

if %errorlevel% equ 0 (
    echo.
    echo [SUCESSO] Banco de dados criado com sucesso!
    echo.
    echo PROXIMO PASSO: execute seed-banco.bat para criar o usuario master,
    echo a clinica provisoria e o administrador inicial.
    echo Depois, execute iniciar-portatil.bat
) else (
    echo.
    echo [ERRO] Falha ao criar o banco de dados.
    echo Verifique:
    echo - Se o MySQL esta rodando
    echo - Se as credenciais no .env estao corretas
    echo - Se voce tem permissao para criar bancos
)

pause