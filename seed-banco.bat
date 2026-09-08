@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Aplicando setup inicial do banco Sunset (master + clinica + admin)...
echo.

:: Verificar se o arquivo .env existe
if not exist ".env" (
    echo [ERRO] Arquivo .env nao encontrado.
    echo Execute instalar-portatil.bat primeiro.
    pause
    exit /b 1
)

if not exist "database\seed-inicial.sql" (
    echo [ERRO] Arquivo database\seed-inicial.sql nao encontrado.
    pause
    exit /b 1
)

for /f "tokens=2 delims==" %%a in ('findstr DATABASE_URL .env') do set DB_URL=%%a
for /f "tokens=2 delims=@" %%a in ("%DB_URL%") do set HOST_PART=%%a
for /f "tokens=1 delims=:" %%a in ("%HOST_PART%") do set USER_PASS=%%a
for /f "tokens=1 delims=:" %%a in ("%USER_PASS%") do set MYSQL_USER=%%a

set MYSQL_CMD=
where mysql >nul 2>&1
if %errorlevel% equ 0 (
    set MYSQL_CMD=mysql
) else (
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

echo Voce precisara fornecer a senha do MySQL (%MYSQL_USER%).
pause

%MYSQL_CMD% -u %MYSQL_USER% -p < database\seed-inicial.sql

if %errorlevel% equ 0 (
    echo.
    echo [SUCESSO] Setup inicial aplicado com sucesso!
    echo.
    echo === CREDENCIAIS ===
    echo Master (consultor, acesso global):
    echo   Email: master@livesun.com.br
    echo   Senha: Master@2024SunSet
    echo.
    echo Admin da clinica (se criado):
    echo   Email: admin@clinica-exemplo.com
    echo   Senha temporaria: Admin123456
    echo.
    echo Voce pode agora executar iniciar-portatil.bat
) else (
    echo.
    echo [ERRO] Falha ao aplicar o setup inicial.
    echo Verifique se o banco 'sunset' existe (execute criar-banco.bat antes).
)

pause
