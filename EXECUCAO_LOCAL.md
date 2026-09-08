# Execução local do SunSet

Este pacote contém o código-fonte completo do SunSet, o esquema MySQL e o arquivo `iniciar-local.bat` para Windows. O arquivo ZIP **não** contém dados de clientes, fotos, credenciais, tokens, variáveis secretas ou a pasta `node_modules`.

## Requisitos

| Item | Versão ou finalidade |
|---|---|
| Node.js | 20 ou superior, com Corepack |
| MySQL | 8.0 ou superior |
| Git | Opcional; não é necessário para iniciar pelo ZIP |
| Brevo | Opcional; necessário somente para e-mails e lembretes reais |

## Preparação do banco

Crie o banco vazio executando `database/sunset_schema_mysql.sql`. O script cria as 26 tabelas, os índices e as chaves únicas do sistema, sem inserir dados operacionais.

```bash
mysql -u SEU_USUARIO -p < database/sunset_schema_mysql.sql
```

## Inicialização no Windows

Extraia o ZIP em uma pasta local. Dê duplo clique em `iniciar-local.bat`. Na primeira execução, o arquivo copiará `config/local.env.template` para `.env`, abrirá-o no Bloco de Notas e solicitará o preenchimento de `DATABASE_URL` e `JWT_SECRET`.

Exemplo de conexão local:

```dotenv
DATABASE_URL=mysql://root:SUA_SENHA@localhost:3306/sunset
JWT_SECRET=uma-chave-longa-aleatoria-e-exclusiva
```

Depois de salvar o `.env`, execute novamente `iniciar-local.bat`. O sistema ficará disponível em `http://localhost:3000`.

> O primeiro gestor deve usar o link **Primeiro acesso do gestor** na tela inicial. Não compartilhe o arquivo `.env`, pois ele contém a conexão do banco e a chave das sessões.

## Execução manual em macOS ou Linux

```bash
corepack enable
corepack pnpm install --frozen-lockfile
NODE_ENV=development corepack pnpm exec tsx watch server/_core/index.ts
```

## Testes e build

| Comando | Finalidade |
|---|---|
| `corepack pnpm test` | Executa os testes de lógica e autorização |
| `corepack pnpm test:e2e` | Executa os testes de interface |
| `corepack pnpm build` | Gera a versão de produção em `dist/` |

## Aviso sobre integrações

O pacote deixa e-mail Brevo disponível por variável de ambiente. Os canais WhatsApp e SMS continuam propositalmente desativados até que seus requisitos e credenciais sejam configurados e a ativação seja autorizada.
