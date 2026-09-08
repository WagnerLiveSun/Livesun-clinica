#!/bin/bash

echo "========================================"
echo "SunSet Clínicas - Setup Portátil"
echo "========================================"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não encontrado. Instale Node.js 18+ primeiro."
    echo "Download: https://nodejs.org/"
    exit 1
fi

echo "[OK] Node.js encontrado:"
node --version
echo ""

# Verificar pnpm
if ! command -v pnpm &> /dev/null; then
    echo "[INFO] pnpm não encontrado. Instalando..."
    npm install -g pnpm
    if [ $? -ne 0 ]; then
        echo "[ERRO] Falha ao instalar pnpm."
        exit 1
    fi
fi

echo "[OK] pnpm encontrado:"
pnpm --version
echo ""

# Instalar dependências se node_modules não existir
if [ ! -d "node_modules" ]; then
    echo "[INFO] Instalando dependências do projeto..."
    pnpm install
    if [ $? -ne 0 ]; then
        echo "[ERRO] Falha ao instalar dependências."
        exit 1
    fi
    echo "[OK] Dependências instaladas."
    echo ""
fi

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "[INFO] Criando arquivo .env..."
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        cat > .env << EOF
DATABASE_URL=mysql://root:password@localhost:3306/sunset_clinicas
PORT=3000
NODE_ENV=production
EOF
    fi
    echo ""
    echo "[IMPORTANTE] Edite o arquivo .env com suas configurações de banco de dados."
    echo "Pressione Enter para abrir o arquivo .env..."
    read
    ${EDITOR:-nano} .env
    echo ""
    echo "[INFO] Após editar o .env, pressione Enter para continuar..."
    read
fi

# Executar setup do banco de dados
echo "[INFO] Executando setup do banco de dados..."
echo ""
pnpm run db:setup

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERRO] Setup do banco de dados falhou."
    echo "Verifique:"
    echo "  1. Se MySQL está rodando"
    echo "  2. Se as credenciais no .env estão corretas"
    echo "  3. Se o usuário MySQL tem permissões"
    exit 1
fi

echo ""
echo "========================================"
echo "Setup concluído com sucesso!"
echo "========================================"
echo ""
echo "Para iniciar o sistema:"
echo "  pnpm run dev        (modo desenvolvimento)"
echo "  pnpm run build      (build para produção)"
echo "  pnpm run start      (iniciar servidor produção)"
echo ""
echo "Acesse: http://localhost:3000"
echo ""
echo "Credenciais temporárias:"
echo "  Email: admin@clinica-exemplo.com"
echo "  Senha: Admin123456"
echo ""
echo "[IMPORTANTE] Altere a senha no primeiro acesso!"
echo ""