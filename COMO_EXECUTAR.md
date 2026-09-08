# Como Executar o LiveSun Clinicas

## 🚀 Formas de Executar o Programa

### Opção 1: Atalho na Área de Trabalho (Recomendado)
```
1. Execute: criar-atalho.bat
2. Um atalho "LiveSun Clinicas" aparecerá na sua área de trabalho
3. Clique duas vezes no atalho para iniciar o programa
4. O navegador abrirá automaticamente em http://localhost:3000
```

### Opção 2: Executar Diretamente
```
1. Clique duas vezes em: LiveSunClinicas.bat
2. O servidor iniciará automaticamente
3. O navegador abrirá em http://localhost:3000
4. Use o sistema normalmente
```

### Opção 3: Script Tradicional
```
1. Execute: iniciar-portatil.bat
2. O servidor iniciará em modo console
3. Acesse http://localhost:3000 no navegador
```

---

## 🔄 Como Funciona o Programa

### Diferença de Programas Tradicionais:
- **Programas tradicionais:** Instalam e têm ícone no Menu Iniciar
- **LiveSun Clinicas:** É um servidor web que roda localmente

### Processo de Execução:
```
┌─────────────────────────────────────┐
│ 1. Você executa LiveSunClinicas.bat │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 2. Script verifica Node.js e MySQL │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 3. Inicia servidor web local        │
│    (http://localhost:3000)          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 4. Navegador abre automaticamente  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 5. Você usa o sistema pelo navegador│
└─────────────────────────────────────┘
```

---

## 🖥️ Interface do Programa

### Como Usar:
- **Tela Principal:** Acessada pelo navegador em http://localhost:3000
- **Funcionamento:** Igual a qualquer site/sistema web
- **Servidor:** Roda em segundo plano (janela de console)

### Para Parar o Programa:
- **Opção 1:** Pressione `Ctrl+C` na janela do console
- **Opção 2:** Feche a janela do console
- **Opção 3:** Clique no "X" da janela do console

---

## 📋 Requisitos de Execução

### Obrigatórios:
- **Node.js 20+** (https://nodejs.org/)
- **Windows 10+**
- **Navegador** (Chrome, Edge, Firefox, etc.)

### Opcionais (para funcionalidades completas):
- **MySQL 8.0+** (para banco de dados)
- **Conexão internet** (para e-mails e comunicações)

---

## 🔧 Primeira Execução

### Se é a primeira vez que você executa:
```
1. Execute: LiveSunClinicas.bat
2. O programa detectará que não há configuração
3. Executará instalar-portatil.bat automaticamente
4. Criará o arquivo .env
5. Abrirá o .env para você configurar
6. Após configurar, execute novamente
```

### Configuração Necessária no .env:
```env
DATABASE_URL=mysql://root:SUA_SENHA@localhost:3306/sunset
JWT_SECRET=chave-longa-aleatoria-para-sessoes
APP_MASTER_KEY=outra-chave-longa-para-segredos
SCHEDULER_SECRET=segredo-do-scheduler
```

---

## 🎯 Comparação com Programas Tradicionais

### Programa Tradicional (ex: Word):
```
Instalar → Ícone no Menu Iniciar → Clicar → Programa abre
```

### LiveSun Clinicas:
```
Extrair ZIP → Executar LiveSunClinicas.bat → Servidor inicia → Navegador abre
```

### Vantagens desta Abordagem:
- ✅ Não requer instalação complexa
- ✅ Atualizações são simples (substituir arquivos)
- ✅ Funciona em qualquer pasta
- ✅ Não altera registro do Windows
- ✅ Fácil de remover (apenas deletar pasta)

---

## ❓ Perguntas Frequentes

### "Por que não é um .exe normal?"
- É um servidor web que roda localmente
- Permite acesso pelo navegador de qualquer dispositivo
- Mais flexível e fácil de manter

### "Preciso deixar o console aberto?"
- Sim, o console precisa ficar aberto enquanto usa o sistema
- Pode minimizar a janela do console
- O sistema continua funcionando minimizado

### "Posso minimizar o console?"
- Sim! Clique no botão de minimizar (_)
- O sistema continua funcionando
- Apenas não feche a janela

### "Como faço para iniciar automaticamente?"
- Pode criar atalho na área de trabalho
- Pode colocar na pasta "Inicializar" do Windows
- Pode usar tarefas agendadas

---

## 🎨 Personalização

### Criar Ícone Personalizado:
```
1. Use criar-atalho.bat para criar atalho
2. Clique direito no atalho > Propriedades
3. Clique em "Alterar Ícone"
4. Escolha um ícone personalizado
5. Clique em OK
```

### Iniciar com Windows:
```
1. Pressione Win+R, digite: shell:startup
2. Copie o atalho para esta pasta
3. O programa iniciará automaticamente
```

---

## 📞 Suporte

### Se o programa não iniciar:
1. Verifique se Node.js está instalado
2. Execute verificar-mysql.bat
3. Verifique o arquivo .env
4. Consulte logs na pasta /logs

### Se o navegador não abrir:
1. Abra manualmente: http://localhost:3000
2. Verifique se a porta 3000 está disponível
3. Tente http://localhost:3001 (se 3000 ocupada)

---

## 🚀 Começando a Usar

### Fluxo Completo:
```
1. Execute criar-atalho.bat (opcional, mas recomendado)
2. Clique no atalho "LiveSun Clinicas"
3. Configure o .env na primeira execução
4. Execute criar-banco.bat para configurar MySQL
5. Use o sistema pelo navegador
6. Pressione Ctrl+C para parar quando terminar
```

**Pronto! Agora você tem uma experiência mais tradicional de programa com atalho na área de trabalho.** 🎉