# Guia de Instalação e Setup Inicial

Este guia descreve como instalar e configurar o sistema SunSet Clínicas do zero, incluindo o setup automatizado para ambientes multi-tenancy.

## 📋 Pré-requisitos

- Node.js 18+ 
- MySQL 8.0+ ou MariaDB 10.5+
- pnpm (Package Manager)
- Variável de ambiente `DATABASE_URL` configurada

## 🚀 Instalação Rápida

### 1. Clonar e Instalar Dependências

```bash
# Navegar até o diretório do projeto
cd clinica-gestao-sistema

# Instalar dependências
pnpm install
```

### 2. Configurar Banco de Dados

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
DATABASE_URL=mysql://usuario:senha@localhost:3306/nome_do_banco
```

### 3. Setup Inicial Automatizado

Execute o comando que vai criar as tabelas e configurar o sistema:

```bash
pnpm run db:setup
```

Este comando executa:
1. `drizzle-kit generate` - Gera as migrations
2. `drizzle-kit migrate` - Aplica as migrations no banco
3. `pnpm run db:seed` - Executa o setup inicial

### 4. Resultado do Setup

Após o setup, você verá uma mensagem como:

```
🎉 SETUP INICIAL CONCLUÍDO COM SUCESSO!
============================================================
� USUÁRIO MASTER (Acesso Global):
👤 Email: master@livesun.com
🔑 Senha: Master@2024SunSet
🎯 Função: Acesso a todas as clínicas para configuração e suporte
============================================================
�📋 Clínica ID: 1
📋 Nome: Clínica Exemplo
🔗 Slug: clinica-principal
🔗 Link de agendamento público: /agendar?clinica=clinica-principal
👤 Email do admin: admin@clinica-exemplo.com
🔑 Senha temporária: Admin123456
============================================================
⚠️  INSTRUÇÕES IMPORTANTES:
🔐 USUÁRIO MASTER:
1. Use para acessar qualquer ambiente de cliente
2. Tem perfil de gestor em todas as clínicas
3. Pode configurar e gerenciar qualquer clínica
4. Ideal para consultores técnicos e suporte

👤 USUÁRIO ADMIN DA CLÍNICA:
1. Acesse o sistema com as credenciais acima
2. Altere a senha imediatamente no primeiro acesso
3. Configure o nome real da sua clínica
4. Atualize o slug se desejar um link personalizado
5. Configure logo, cores e outras informações
6. Cadastre serviços, profissionais e questionários
7. Teste o link de agendamento público
============================================================
```

## � Usuário Master

### Credenciais de Acesso Global
- **Email**: `master@livesun.com`
- **Senha**: `Master@2024SunSet`
- **Função**: Consultor Master com acesso a todas as clínicas

### Funcionalidades do Master
- **Acesso Global**: Pode acessar qualquer clínica configurada no sistema
- **Perfil Administrativo**: Tem permissões de gestor em todas as clínicas
- **Suporte Técnico**: Ideal para consultores realizarem configurações e suporte
- **Visualização Multi-tenancy**: Vê todas as clínicas disponíveis no sistema
- **Gerenciamento**: Pode configurar e gerenciar dados de qualquer clínica

### Quando Usar o Usuário Master
- **Configuração Inicial**: Ao acessar um novo ambiente de cliente
- **Suporte Técnico**: Para resolver problemas em ambientes de clientes
- **Demonstração**: Para mostrar funcionalidades em diferentes clínicas
- **Migração**: Para auxiliar na migração de dados entre clínicas
- **Auditoria**: Para verificar configurações e dados em múltiplas clínicas

### Segurança do Usuário Master
- **Senha Forte**: Senha complexa para maior segurança
- **Acesso Controlado**: Deve ser usado apenas por consultores autorizados
- **Auditoria Completa**: Todas as ações do master são registradas
- **Isolamento Mantido**: Dados continuam isolados por clínica, apenas o acesso é global

## 🔧 Primeiro Acesso e Configuração

### 1. Acessar como Usuário Master (Opcional)

Se você é um consultor técnico e precisa acessar o sistema:

```
http://localhost:3000
```

Faça login com as credenciais master:
- **Email**: `master@livesun.com`
- **Senha**: `Master@2024SunSet`

### 2. Acessar como Usuário Admin da Clínica

Para configuração normal da clínica:

Faça login com as credenciais do admin:
- **Email**: `admin@clinica-exemplo.com`
- **Senha**: `Admin123456`

### 3. Configuração Inicial (Wizard)

No primeiro acesso, você será guiado por um wizard de configuração:

1. **Dados da Clínica**:
   - Nome real da clínica
   - Slug personalizado (opcional - será gerado automaticamente se não informado)
   - Logo e identidade visual

2. **Dados do Administrador**:
   - Seu nome completo
   - Seu email real
   - Nova senha segura

3. **Configurações Adicionais**:
   - Cores da marca
   - Informações de contato
   - Endereço

### 4. Configurar Link de Agendamento

Após a configuração inicial, o sistema fornecerá o link personalizado:

```
/agendar?clinica=seu-slug-personalizado
```

Este link pode ser compartilhado publicamente para agendamento online.

## 📊 Comandos Disponíveis

### Desenvolvimento
```bash
pnpm run dev          # Inicia servidor em modo desenvolvimento
pnpm run build        # Build para produção
pnpm run start        # Inicia servidor em produção
```

### Banco de Dados
```bash
pnpm run db:push      # Gera e aplica migrations
pnpm run db:seed      # Executa apenas o setup inicial
pnpm run db:setup     # Setup completo (migrations + seed)
```

### Testes
```bash
pnpm run test         # Executa testes unitários
pnpm run test:e2e     # Executa testes end-to-end
pnpm run check        # Verificação de tipos TypeScript
```

## 🏗️ Arquitetura Multi-tenancy

O sistema suporta múltiplas clínicas no mesmo banco de dados através de:

### Isolamento por `clinicaId`
- Todas as tabelas têm campo `clinicaId`
- Queries são filtradas automaticamente por clínica
- Cada clínica tem dados completamente isolados
- Usuários master têm `clinicaId = null` para acesso global

### Identificação por Slug
- Cada clínica tem um slug único global
- Link público: `/agendar?clinica=slug-da-clinica`
- Slug é usado para roteamento correto no agendamento público

### Setup Inicial
- Cria clínica provisória com slug `"clinica-principal"`
- Usuário master para acesso global (consultores)
- Usuário admin temporário para primeiro acesso
- Configurações básicas pré-definidas
- Permite reconfiguração completa no wizard inicial

### Hierarquia de Acesso
1. **Master**: Acesso global a todas as clínicas
2. **Admin**: Acesso administrativo à sua clínica específica
3. **Recepção**: Acesso operacional à sua clínica
4. **Profissional**: Acesso a suas sessões e pacientes
5. **Cliente**: Acesso ao seu portal pessoal

## 🔐 Segurança

### Senhas Temporárias
- **Master**: `Master@2024SunSet` - Senha forte para acesso global
- **Admin**: `Admin123456` - Senha temporária que deve ser alterada no primeiro acesso
- Sistema força alteração no primeiro acesso através do wizard

### Isolamento de Dados
- Cada clínica só acessa seus próprios dados
- Validação cruzada em todos os endpoints
- Auditoria completa de ações
- Master tem acesso global mas dados permanecem isolados

### Backup e Restore
- Considerar implementar backups regulares do banco
- Cada clínica pode ter seu próprio backup se necessário
- Usuário master facilita backup e restore multi-clínica

## 🐛 Solução de Problemas

### Setup não executa
```bash
# Verificar se DATABASE_URL está configurado
echo $DATABASE_URL

# Verificar conexão com banco
mysql -h localhost -u usuario -p nome_do_banco
```

### Erro "Clínica não encontrada"
- Verifique se o setup foi executado
- Confirme que a tabela `clinicas` tem registros
- Verifique o slug na URL de agendamento

### Erro de permissão
- Certifique-se que o usuário do MySQL tem permissões
- Execute: `GRANT ALL PRIVILEGES ON nome_do_banco.* TO 'usuario'@'localhost';`

### Acesso Master não funciona
- Verifique se o setup foi executado completamente
- Confirme que o usuário master foi criado no banco
- Verifique as credenciais do master

## 📞 Suporte

Para problemas ou dúvidas:
- Verifique os logs do servidor
- Consulte a documentação técnica
- Entre em contato com o suporte LiveSun

## 🔄 Atualizações

Para atualizar o sistema:

```bash
# Pull das atualizações
git pull

# Atualizar dependências
pnpm install

# Aplicar novas migrations
pnpm run db:push

# Reiniciar servidor
pnpm run start
```

---

**Sistema SunSet Clínicas** - Versão 1.0.0  
Desenvolvido para gestão multi-tenancy de clínicas  
Com suporte a usuários master para consultores técnicos