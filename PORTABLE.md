# Guia de Empacotamento Portátil

Este guia descreve como criar uma versão portátil do sistema SunSet Clínicas para distribuição e instalação simplificada.

## 📦 Empacotamento para Distribuição

### Pré-requisitos
- Node.js 18+ instalado
- pnpm instalado globalmente
- Sistema operacional compatível (Windows, Linux, macOS)

### Processo de Build

#### 1. Build da Aplicação

```bash
# Instalar dependências
pnpm install

# Build para produção
pnpm run build
```

Isso cria:
- `dist/` - Arquivos do servidor bundleados
- `dist/public/` - Arquivos estáticos do cliente

#### 2. Empacotamento com pkg

O sistema já está configurado com `pkg` no package.json para criar executáveis:

```bash
# Criar executável (configuração existente no package.json)
pnpm pkg build ./dist/index.js --targets node18-win-x64,node18-linux-x64,node18-macos-x64 --output dist/sunset-clinicas
```

Isso cria executáveis para:
- Windows (`sunset-clinicas-win.exe`)
- Linux (`sunset-clinicas-linux`)  
- macOS (`sunset-clinicas-macos`)

## 🚀 Instalação Portátil

### Estrutura de Diretórios Sugerida

```
sunset-clinicas-portable/
├── sunset-clinicas.exe        # Executável (Windows)
├── dist/
│   ├── public/                # Arquivos estáticos
│   └── index.js               # Servidor bundleado
├── .env.example              # Exemplo de configuração
├── INSTALL.md                # Guia de instalação
├── README.md                # Instruções básicas
└── setup.bat                # Script de setup (Windows)
```

### Script de Setup Automatizado (Windows)

Crie `setup.bat`:

```batch
@echo off
echo ========================================
echo SunSet Clínicas - Setup Portátil
echo ========================================
echo.

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js não encontrado. Instale Node.js 18+ primeiro.
    pause
    exit /b 1
)

REM Criar arquivo .env se não existir
if not exist .env (
    echo Criando arquivo .env...
    copy .env.example .env
    echo.
    echo [IMPORTANTE] Edite o arquivo .env com suas configurações de banco de dados.
    echo Pressione qualquer tecla para abrir o arquivo .env...
    pause >nul
    notepad .env
)

REM Executar setup do banco de dados
echo.
echo Executando setup do banco de dados...
call pnpm run db:setup

if %errorlevel% neq 0 (
    echo [ERRO] Setup do banco de dados falhou.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup concluído com sucesso!
echo ========================================
echo.
echo Para iniciar o sistema:
echo   sunset-clinicas.exe
echo.
echo Ou em modo desenvolvimento:
echo   pnpm run dev
echo.
pause
```

### Script de Setup (Linux/macOS)

Crie `setup.sh`:

```bash
#!/bin/bash

echo "========================================"
echo "SunSet Clínicas - Setup Portátil"
echo "========================================"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não encontrado. Instale Node.js 18+ primeiro."
    exit 1
fi

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "Criando arquivo .env..."
    cp .env.example .env
    echo ""
    echo "[IMPORTANTE] Edite o arquivo .env com suas configurações de banco de dados."
    echo "Pressione Enter para abrir o arquivo .env..."
    read
    ${EDITOR:-nano} .env
fi

# Executar setup do banco de dados
echo ""
echo "Executando setup do banco de dados..."
pnpm run db:setup

if [ $? -ne 0 ]; then
    echo "[ERRO] Setup do banco de dados falhou."
    exit 1
fi

echo ""
echo "========================================"
echo "Setup concluído com sucesso!"
echo "========================================"
echo ""
echo "Para iniciar o sistema:"
echo "  ./sunset-clinicas"
echo ""
echo "Ou em modo desenvolvimento:"
echo "  pnpm run dev"
echo ""
```

## 🗂️ Arquivo .env.example

Crie `.env.example`:

```env
# Configurações de Banco de Dados
DATABASE_URL=mysql://root:password@localhost:3306/sunset_clinicas

# Configurações do Servidor (opcional)
PORT=3000
NODE_ENV=production

# Configurações de Storage (opcional - para S3/compatível)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=
# S3_BUCKET=
```

## 📋 Checklist de Distribuição

Antes de distribuir a versão portátil:

- [ ] Build executado com sucesso
- [ ] Executáveis criados para todas as plataformas
- [ ] Arquivos estáticos incluídos em `dist/public/`
- [ ] Script de setup criado para cada plataforma
- [ ] `.env.example` incluído
- [ ] Documentação (INSTALL.md, README.md) incluída
- [ ] Teste de instalação limpa realizado
- [ ] Teste de setup inicial realizado
- [ ] Teste de agendamento público realizado

## 🚀 Uso da Versão Portátil

### Para o Usuário Final

1. **Descompactar** o arquivo baixado
2. **Editar** o arquivo `.env` com suas configurações
3. **Executar** o script de setup (`setup.bat` ou `setup.sh`)
4. **Iniciar** o sistema executando o executável
5. **Acessar** `http://localhost:3000`
6. **Configurar** o sistema através do wizard inicial

### Configuração Pós-Setup

Após o setup inicial, o usuário deve:

1. Fazer login com credenciais temporárias
2. Executar o wizard de configuração inicial
3. Configurar nome real da clínica
4. Personalizar o slug para o link de agendamento
5. Configurar identidade visual (logo, cores)
6. Cadastar serviços e profissionais
7. Testar o link de agendamento público

## 🔧 Manutenção da Versão Portátil

### Atualizações

Para atualizar a versão portátil:

1. Build nova versão
2. Substituir executáveis e arquivos
3. Executar migrations: `pnpm run db:push`
4. Reiniciar servidor

### Backup

Para backup da versão portátil:

1. Parar o servidor
2. Fazer backup do banco de dados MySQL
3. Fazer backup do arquivo `.env`
4. Compactar diretório da aplicação

## 🐛 Troubleshooting Portátil

### Executável não inicia
- Verifique permissões (Linux/macOS: `chmod +x sunset-clinicas`)
- Verifique se Node.js está instalado
- Verifique logs de erro

### Setup falha
- Verifique se MySQL está rodando
- Verifique credenciais no `.env`
- Verifique se usuário MySQL tem permissões

### Agendamento não funciona
- Verifique se setup foi executado
- Verifique slug na URL
- Verifique se clínica está ativa

## 📦 Distribuição

### Formatos Sugeridos

- **ZIP**: Simples, compatível com todos os sistemas
- **7Z**: Melhor compressão
- **Tar.gz**: Padrão Linux/macOS

### Nomenclatura Sugerida

```
sunset-clinicas-v1.0.0-portable-win.zip
sunset-clinicas-v1.0.0-portable-linux.tar.gz
sunset-clinicas-v1.0.0-portable-macos.zip
```

### Opcionais de Distribuição

- Incluir servidor MySQL embedded (para simplificar setup)
- Incluir instruções de instalação do MySQL
- Criar installer personalizado (NSIS, InnoSetup, etc.)

---

**Sistema SunSet Clínicas** - Versão Portátil 1.0.0  
Desenvolvido para distribuição simplificada