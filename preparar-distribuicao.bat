@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Preparando pacote de distribuicao do LiveSun Clinicas...
echo.

:: Criar pasta temporaria para distribuicao
set DIST_DIR=LiveSun_Clinicas_Portatil
if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"
mkdir "%DIST_DIR%"

echo Criando estrutura de diretorios...
mkdir "%DIST_DIR%\dist"
mkdir "%DIST_DIR%\dist\public"
mkdir "%DIST_DIR%\dist\public\assets"
mkdir "%DIST_DIR%\config"
mkdir "%DIST_DIR%\database"

echo Copiando arquivos do build...
copy "dist\index.js" "%DIST_DIR%\dist\" >nul
copy "dist\public\index.html" "%DIST_DIR%\dist\public\" >nul
xcopy "dist\public\assets\*" "%DIST_DIR%\dist\public\assets\" /Y /Q >nul

echo Copiando scripts de instalacao...
copy "instalar-portatil.bat" "%DIST_DIR%\" >nul
copy "iniciar-portatil.bat" "%DIST_DIR%\" >nul
copy "LiveSunClinicas.bat" "%DIST_DIR%\" >nul
copy "criar-atalho.bat" "%DIST_DIR%\" >nul
copy "verificar-mysql.bat" "%DIST_DIR%\" >nul
copy "criar-banco.bat" "%DIST_DIR%\" >nul
copy "seed-banco.bat" "%DIST_DIR%\" >nul

echo Copiando configuracao e banco...
copy "config\local.env.template" "%DIST_DIR%\config\" >nul
copy "database\sunset_schema_mysql.sql" "%DIST_DIR%\database\" >nul
copy "database\seed-inicial.sql" "%DIST_DIR%\database\" >nul

echo Copiando documentacao...
for %%F in (INSTALACAO_EXECUTAVEL_WINDOWS.md README_PORTATIL.md RESUMO_EMPACOTAMENTO.md MELHORIAS_MYSQL.md PROCESSO_CONCLUIDO.md ATUALIZACAO_EXECUCAO.md APRESENTACAO_FUNCIONALIDADES.md INSTRUCOES_POWERPOINT.md GUIA_RAPIDO_USUARIO.md COMO_EXECUTAR.md LISTA_ARQUIVOS_DISTRIBUICAO.txt CREDENCIAIS_MASTER.md) do (
  if exist "%%F" copy /Y "%%F" "%DIST_DIR%\" >nul
)

echo.
echo Pacote preparado em: %DIST_DIR%
echo.
echo Tamanho do pacote:
dir "%DIST_DIR%" /s | find "File(s)"
echo.
echo Compacte a pasta %DIST_DIR% em ZIP para distribuicao.
pause