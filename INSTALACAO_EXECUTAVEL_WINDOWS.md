# LiveSun Clinicas - Instalação portátil Windows

## O que é instalado

O pacote portátil executa o servidor web do LiveSun Clinicas em `http://localhost:3000`. A interface é acessada pelo navegador; não é necessário instalar uma aplicação desktop separada.

O pacote não contém banco, senhas, chaves Brevo ou dados de pacientes.

## Requisitos

- Windows 10 ou superior.
- Node.js 20 ou superior (https://nodejs.org/).
- MySQL 8.0 ou superior, local ou em servidor acessível.
- Permissão para criar arquivos na pasta de instalação.
- Navegador atualizado.

## Instalação

1. **Instale o MySQL 8.0+** (se ainda não tiver):
   - Baixe em: https://dev.mysql.com/downloads/installer/
   - Anote a senha do usuário root durante a instalação

2. **Extraia o ZIP** em uma pasta permanente, por exemplo `C:\LiveSun`.

3. **Execute `instalar-portatil.bat`** uma vez.
   - Verificará o Node.js e criará a estrutura de diretórios
   - Criará o arquivo `.env` e abrirá para edição

4. **Configure o `.env`** com suas credenciais:
   - `DATABASE_URL`: Conexão MySQL (ex: `mysql://root:SUA_SENHA@localhost:3306/sunset`)
   - `JWT_SECRET`: Chave longa e aleatória para sessões
   - `APP_MASTER_KEY`: Chave para criptografar segredos
   - `SCHEDULER_SECRET`: Segredo para o scheduler interno

5. **Verifique o MySQL** executando `verificar-mysql.bat`.
   - Confirmará se o MySQL está instalado e acessível
   - Mostrará a versão e caminho do MySQL

6. **Crie o banco de dados** executando `criar-banco.bat`.
   - Pedirá a senha do MySQL
   - Executará automaticamente o script `database\sunset_schema_mysql.sql`
   - Criará todas as tabelas necessárias

7. **Inicie o sistema** executando `iniciar-portatil.bat`.
   - Iniciará o servidor Node.js
   - Abrirá automaticamente o navegador em `http://localhost:3000`

## Configuração mínima do `.env`

```dotenv
DATABASE_URL=mysql://root:SENHA@localhost:3306/sunset
JWT_SECRET=chave-longa-e-unica-para-sessoes
APP_MASTER_KEY=outra-chave-longa-e-unica-para-segredos
SCHEDULER_SECRET=segredo-longo-do-scheduler
REMINDER_INTERVAL_MS=300000
STORAGE_DIR=./storage
PORT=3000
```

Nunca compartilhe o `.env`. A `APP_MASTER_KEY` é necessária para descriptografar API keys Brevo armazenadas no MySQL. Se ela for perdida, os segredos armazenados precisarão ser cadastrados novamente.

## Primeiro acesso

O banco precisa possuir uma clínica e um gestor `admin` sem senha. O primeiro gestor usa **Primeiro acesso do gestor** na tela inicial para receber o link de definição de senha.

Depois do login, configure o Brevo em **Gestão > Comunicações da clínica**. A API key é salva criptografada por clínica e não volta para o navegador.

## Diretórios

- `dist/index.js`: servidor compilado (requer Node.js).
- `config`: arquivos de configuração e exemplos.
- `database`: esquema MySQL.
- `storage`: fotos clínicas e logos enviados.
- `logs`: logs operacionais locais.
- `.env`: configuração privada da instalação.

## Operação SaaS

Em produção, execute uma instância do servidor para o SaaS e mantenha `DATABASE_URL` apontando para o MySQL central. Cada clínica deve possuir seu próprio `clinicaId`; as configurações de comunicação são isoladas no banco.

## Atualização

1. Faça backup do MySQL e da pasta `storage`.
2. Feche o servidor (Ctrl+C no terminal).
3. Substitua os arquivos do novo pacote, preservando `.env`, `storage` e `logs`.
4. Execute `iniciar-portatil.bat` novamente.

## Solução de problemas

- **Node.js não encontrado**: instale o Node.js 20+ de https://nodejs.org/
- **MySQL não encontrado**: execute `verificar-mysql.bat` para diagnosticar
- **Erro ao conectar ao MySQL**: verifique se o serviço MySQL está rodando e se as credenciais no `.env` estão corretas
- **Porta ocupada**: altere `PORT` no `.env` e abra a nova porta no navegador
- **Banco não criado**: execute `criar-banco.bat` novamente
- **Brevo não envia**: configure a API key na tela de Gestão e valide remetente no Brevo
- **Logo não carrega**: confira a existência do arquivo em `storage` e as permissões da pasta
- **Erro ao iniciar**: verifique se o Node.js está instalado e se o build foi executado (`pnpm run build`)
