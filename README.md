# SunSet Clínicas - Sistema de Gestão Multi-tenancy

Sistema completo de gestão para clínicas com suporte multi-tenancy, agendamento online e gestão integrada.

## 🚀 Início Rápido

### Instalação

Para instalação completa, siga o guia detalhado em [INSTALL.md](INSTALL.md).

Resumo rápido:

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar banco de dados (criar arquivo .env)
# DATABASE_URL=mysql://usuario:senha@localhost:3306/nome_do_banco

# 3. Setup inicial automatizado
pnpm run db:setup

# 4. Iniciar sistema
pnpm run dev
```

Acesse: `http://localhost:3000`

### Credenciais Iniciais

Após o setup inicial:
- **Email**: `admin@clinica-exemplo.com`
- **Senha**: `Admin123456`

⚠️ **Importante**: Altere a senha no primeiro acesso!

## 📋 Documentação

- **[INSTALL.md](INSTALL.md)** - Guia completo de instalação e configuração
- **[PORTABLE.md](PORTABLE.md)** - Guia de empacotamento para distribuição portátil
- **[SETUP_IMPLEMENTATION.md](SETUP_IMPLEMENTATION.md)** - Detalhes técnicos da implementação

## 🏗️ Características

### Multi-tenancy
- Suporte a múltiplas clínicas no mesmo banco de dados
- Isolamento completo de dados por clínica
- Links de agendamento personalizados por slug

### Agendamento Online
- Sistema de autoagendamento público
- Anamnese integrada
- Confirmação automática
- Lembretes por email/WhatsApp/SMS

### Gestão Completa
- Cadastro de clientes e prontuários
- Gestão de serviços e profissionais
- Controle financeiro e comissões
- Auditoria completa de ações

## 🛠️ Comandos Disponíveis

### Desenvolvimento
```bash
pnpm run dev          # Servidor desenvolvimento
pnpm run build        # Build para produção
pnpm run start        # Servidor produção
```

### Banco de Dados
```bash
pnpm run db:push      # Migrations
pnpm run db:seed      # Setup inicial
pnpm run db:setup     # Setup completo
```

### Scripts de Setup
```bash
setup.bat             # Setup Windows
setup.sh              # Setup Linux/macOS
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```env
DATABASE_URL=mysql://root:password@localhost:3306/sunset_clinicas
PORT=3000
NODE_ENV=production
```

### Primeiro Acesso

1. Faça login com credenciais temporárias
2. Execute o wizard de configuração inicial
3. Configure nome real da clínica
4. Personalize o slug para link de agendamento
5. Configure identidade visual

## 📱 Link de Agendamento Público

Após a configuração, o sistema fornecerá o link personalizado:

```
/agendar?clinica=seu-slug-personalizado
```

Este link pode ser compartilhado publicamente para agendamento online.

## 🔐 Segurança

- Isolamento completo de dados por clínica
- Senha temporária com alteração obrigatória
- Auditoria completa de ações
- Validação cruzada em todos os endpoints

## 🐛 Solução de Problemas

Para problemas detalhados, consulte [INSTALL.md](INSTALL.md).

### Problemas Comuns

**Setup não executa**: Verifique `DATABASE_URL` no `.env`

**Erro "Clínica não encontrada"**: Execute `pnpm run db:setup`

**Erro de permissão MySQL**: Verifique permissões do usuário

## 📞 Suporte

Para suporte técnico, consulte a documentação ou entre em contato com a equipe LiveSun.

## 📄 Licença

MIT License - Veja arquivo LICENSE para detalhes

---

**SunSet Clínicas** - Versão 1.0.0  
Sistema de Gestão Multi-tenancy para Clínicas