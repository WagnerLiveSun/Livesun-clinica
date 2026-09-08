@echo off
echo ========================================
echo SunSet Clínicas - Setup Portátil
echo ========================================
echo.

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js não encontrado. Instale Node.js 18+ primeiro.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js encontrado:
node --version
echo.

REM Verificar pnpm
pnpm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] pnpm não encontrado. Instalando...
    npm install -g pnpm
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar pnpm.
        pause
        exit /b 1
    )
)

echo [OK] pnpm encontrado:
pnpm --version
echo.

REM Instalar dependências se node_modules não existir
if not exist node_modules (
    echo [INFO] Instalando dependências do projeto...
    call pnpm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependências.
        pause
        exit /b 1
    )
    echo [OK] Dependências instaladas.
    echo.
)

REM Criar arquivo .env se não existir
if not exist .env (
    echo [INFO] Criando arquivo .env...
    if exist .env.example (
        copy .env.example .env
    ) else (
        echo DATABASE_URL=mysql://root:password@localhost:3306/sunset_clinicas > .env
        echo PORT=3000 >> .env
        echo NODE_ENV=production >> .env
    )
    echo.
    echo [IMPORTANTE] Edite o arquivo .env com suas configurações de banco de dados.
    echo Pressione qualquer tecla para abrir o arquivo .env...
    pause >nul
    notepad .env
    echo.
    echo [INFO] Após editar o .env, pressione qualquer tecla para continuar...
    pause >nul
)

REM Executar setup do banco de dados
echo [INFO] Executando setup do banco de dados...
echo.
call pnpm run db:setup

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Setup do banco de dados falhou.
    echo Verifique:
    echo   1. Se MySQL está rodando
    echo   2. Se as credenciais no .env estão corretas
    echo   3. Se o usuário MySQL tem permissões
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup concluído com sucesso!
echo ========================================
echo.
echo Para iniciar o sistema:
echo   pnpm run dev        (modo desenvolvimento)
echo   pnpm run build      (build para produção)
echo   pnpm run start      (iniciar servidor produção)
echo.
echo Acesse: http://localhost:3000
echo.
echo Credenciais temporárias:
echo   Email: admin@clinica-exemplo.com
echo   Senha: Admin123456
echo.
echo [IMPORTANTE] Altere a senha no primeiro acesso!
echo.
pause