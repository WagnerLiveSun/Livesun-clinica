@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Verificando instalacao do MySQL...
echo.

:: Verificar se mysql esta no PATH
where mysql >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] MySQL encontrado no PATH
    mysql --version
    echo.
    echo MySQL esta instalado e configurado.
    echo Voce pode criar o banco executando:
    echo mysql -u root -p ^< database\sunset_schema_mysql.sql
    pause
    exit /b 0
)

:: Verificar instalacoes comuns do MySQL
set MYSQL_PATHS="C:\Program Files\MySQL\MySQL Server 8.0\bin" "C:\Program Files\MySQL\MySQL Server 9.0\bin" "C:\MySQL\bin"

for %%P in (%MYSQL_PATHS%) do (
    if exist "%%P\mysql.exe" (
        echo [OK] MySQL encontrado em: %%P
        echo.
        echo Para usar o MySQL, adicione este caminho ao PATH do Windows
        echo ou use o caminho completo ao executar comandos.
        echo.
        echo Exemplo para criar o banco:
        echo "%%P\mysql.exe" -u root -p ^< database\sunset_schema_mysql.sql
        pause
        exit /b 0
    )
)

echo [ERRO] MySQL nao encontrado no sistema.
echo.
echo Por favor, instale o MySQL 8.0 ou superior:
echo https://dev.mysql.com/downloads/installer/
echo.
echo Durante a instalacao, anote:
echo - A senha do usuario root
echo - A porta usada (padrao: 3306)
echo.
pause
exit /b 1