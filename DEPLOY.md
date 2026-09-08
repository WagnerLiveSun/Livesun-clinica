# Deploy — LiveSun Clinicas (Render + Hostinger)

## 1. Banco de dados na Hostinger

1. hPanel → **Bancos de Dados** → confirme que o banco `u951548013_clinica` e o usuário `u951548013_LS_Clinica` existem.
2. Abra o **phpMyAdmin** (hPanel → Bancos de Dados → Entrar no phpMyAdmin).
3. Selecione o banco `u951548013_clinica` → aba **Importar** → escolha `database/import-hostinger.sql` → **Executar**.
   - Este arquivo cria as 26 tabelas e insere os dados iniciais (usuário master, clínica provisória e admin).
4. **Acesso remoto (necessário para o Render):** hPanel → Bancos de Dados → **MySQL Remoto** → adicione o IP `0.0.0.0/0` (qualquer host) ou, preferencialmente, os IPs de saída do Render (visíveis no painel do serviço em *Outbound IPs*).

## 2. Deploy no Render

1. Acesse https://dashboard.render.com → **New → Web Service** → conecte o repositório `WagnerLiveSun/Livesun-clinica`.
2. O arquivo `render.yaml` na raiz já define o serviço, mas confira:
   - **Runtime:** Node
   - **Build:** `corepack enable && pnpm install && pnpm run build`
   - **Start:** `node dist/index.js`
3. Em **Environment**, cadastre a variável:
   - `DATABASE_URL` = `mysql://u951548013_LS_Clinica:Quemsabe123!A@<HOST_HOSTINGER>:3306/u951548013_clinica`
     - `<HOST_HOSTINGER>` = host exibido em "MySQL Remoto" no hPanel (ex.: `srv1234.hstgr.io`).
     - Se a senha tiver caracteres especiais, use URL-encoded (ex.: `!` → `%21` → `Quemsabe123%21A`).
   - `JWT_SECRET`, `APP_MASTER_KEY`, `SCHEDULER_SECRET` — chaves longas e aleatórias (o render.yaml já gera automaticamente).
   - Opcional: `BREVO_API_KEY`, `BREVO_FROM_EMAIL=suporte@livesun.com.br`.
4. **Create Web Service** e aguarde o build. A URL pública será algo como `https://livesun-clinica.onrender.com`.

## 3. Atualizações

Qualquer `git push` para `main` dispara novo deploy automático no Render (quando Auto-Deploy estiver habilitado).

## ⚠️ Segurança

- Credenciais **nunca** são versionadas (`.gitignore` bloqueia `.env`, `CREDENCIAIS_MASTER.md`, `Acesso_Mysql_Hostinger_Clinica.txt`).
- Troque a senha do usuário master (`Master@2024SunSet`) no primeiro acesso em produção.
