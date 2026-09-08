# Guia Rápido do Usuário - LiveSun Clinicas
## Referência Rápida para Uso Diário

---

## 🚀 Início Rápido (5 minutos)

### 1. Acessar o Sistema
```
1. Execute: iniciar-portatil.bat
2. Aguarde o servidor iniciar
3. Navegador abre automaticamente em: http://localhost:3000
```

### 2. Primeiro Acesso
```
1. Clique em "Primeiro acesso do gestor"
2. Insira seu e-mail
3. Receba link e defina senha
4. Configure sua clínica inicial
```

### 3. Dashboard
```
- Visão geral do dia
- Próximos atendimentos
- Estatísticas rápidas
- Acesso rápido às funções
```

---

## 👥 Gestão de Pessoas

### Adicionar Profissional
```
Gestão > Equipe > Adicionar Profissional
→ Preencha dados → Configure horários → Defina comissões → Salve
```

### Cadastrar Cliente
```
Clientes > Novo Cliente
→ Dados pessoais → Histórico médico → Preferências → Salve
```

### Editar Usuário
```
Gestão > Equipe > Selecionar profissional > Editar
→ Atualize dados → Salve
```

---

## 📅 Agendamento

### Nova Sessão
```
Agenda > Nova Sessão
→ Selecione cliente → Escolha serviço → Defina data/hora → Confirme
```

### Ver Agenda
```
Agenda > Visão Diária/Semanal/Mensal
→ Clique na sessão para detalhes
```

### Reagendar
```
Agenda > Selecionar sessão > Reagendar
→ Nova data/hora → Confirme → Enviar notificação
```

### Cancelar
```
Agenda > Selecionar sessão > Cancelar
→ Motivo → Confirmar → Notificar cliente
```

---

## 🏥 Atendimento

### Registrar Evolução
```
Agenda > Selecionar sessão > Registrar Evolução
→ Status: Em Atendimento → Observações → Fotos → Salvar
→ Status: Concluído
```

### Ver Prontuário
```
Clientes > Selecionar cliente > Prontuário
→ Histórico completo → Evoluções → Fotos → Questionários
```

### Adicionar Fotos
```
Na evolução > Adicionar Fotos
→ Categoria (Antes/Depois/Evolução) → Upload → Legenda → Salvar
```

---

## 💰 Financeiro

### Registrar Pagamento
```
Financeiro > Recebíveis
→ Selecionar lançamento → Status: Pago → Salvar
```

### Ver Relatório
```
Relatórios > Faturamento
→ Período → Filtros → Visualizar gráficos
```

### Comissões
```
Calculadas automaticamente ao marcar sessão como paga
→ Profissionais veem em seu dashboard
```

---

## 🔧 Configurações

### Clínica
```
Gestão > Configurações da Clínica
→ Dados cadastrais → Logo → Horários → Salvar
```

### Serviços
```
Serviços > Novo Serviço
→ Nome/Descrição → Duração → Valor → Profissionais → Salvar
```

### Estoque
```
Estoque > Insumos > Novo Insumo
→ Nome/Unidade → Estoque → Custo → Associar serviços → Salvar
```

---

## 📧 Comunicações

### Configurar E-mail
```
Gestão > Comunicações > Brevo
→ API Key → Remetente → Testar envio → Salvar
```

### Lembretes Automáticos
```
Gestão > Configurações > Lembretes
→ Intervalo (minutos) → Canais → Salvar
```

### Enviar Manual
```
Clientes > Selecionar cliente > Enviar mensagem
→ Canal → Conteúdo → Enviar
```

---

## 🔍 Busca e Filtros

### Busca Global
```
Barra de busca no topo
→ Digite nome, serviço, data → Resultados instantâneos
```

### Filtros de Agenda
```
Agenda > Filtros
→ Período → Profissional → Status → Serviço → Aplicar
```

### Relatórios Avançados
```
Relatórios > Personalizado
→ Múltiplos filtros → Período → Gerar
```

---

## ⚡ Atalhos e Dicas

### Navegação
- **Menu lateral:** Acesso rápido a todas funções
- **Dashboard:** Visão geral sempre disponível
- **Busca:** Encontre qualquer coisa rapidamente

### Eficiência
- **Agendamento público:** Reduz carga da recepção
- **Lembretes automáticos:** Diminui faltas
- **Questionários:** Padroniza coleta de dados

### Segurança
- **Backup regular:** Exporte dados periodicamente
- **Senhas fortes:** Proteja acessos
- **Permissões:** Controle quem vê o quê

---

## 🚨 Problemas Comuns

### Sistema não inicia
```
✓ Verifique Node.js instalado
✓ Confirme MySQL rodando
✓ Execute verificar-mysql.bat
✓ Execute criar-banco.bat
```

### Login falha
```
✓ Use "Primeiro acesso" para novos usuários
✓ Verifique e-mail e senha
✓ Reenvie link de reset
```

### Agendamento não funciona
```
✓ Verifique disponibilidade
✓ Confirme serviço ativo
✓ Valide profissional disponível
```

### E-mails não chegam
```
✓ Verifique configuração Brevo
✓ Confirme remetente validado
✓ Verifique caixa de spam
```

---

## 📱 Checklist Diário

### Manhã
- [ ] Verificar agenda do dia
- [ ] Confirmar atendimentos
- [ ] Verificar estoque crítico

### Durante o Dia
- [ ] Registrar evoluções
- [ ] Atualizar status de sessões
- [ ] Respondender dúvidas de clientes

### Final do Dia
- [ ] Verificar faturamento
- [ ] Revisar agenda do próximo dia
- [ ] Atualizar estoque se necessário

### Semanal
- [ ] Backup do banco
- [ ] Revisar relatórios
- [ ] Atualizar cadastros

---

## 🎯 Fluxo de Atendimento Completo

### 1. Chegada do Cliente
```
Recepção > Agenda > Confirmar presença
→ Atualizar status → Iniciar atendimento
```

### 2. Durante Atendimento
```
Profissional > Prontuário > Evolução
→ Registrar procedimento → Fotos → Observações
```

### 3. Pós-Atendimento
```
→ Status: Concluído → Pagamento → Agendar retorno
→ Follow-up automático (se configurado)
```

---

## 📞 Suporte Rápido

### Scripts Úteis
```
verificar-mysql.bat      → Diagnóstico MySQL
criar-banco.bat          → Recriar banco
instalar-portatil.bat   → Reinstalar
```

### Arquivos de Log
```
logs/                    → Logs do sistema
.env                     → Configuração
database/                → Schema SQL
```

### Documentação
```
INSTALACAO_EXECUTAVEL_WINDOWS.md → Instalação
README_PORTATIL.md              → Visão geral
APRESENTACAO_FUNCIONALIDADES.md → Tutorial completo
```

---

## 💡 Dicas de Produtividade

### Para Recepção
- Use busca global para encontrar clientes rapidamente
- Configure lembretes para reduzir faltas
- Use agendamento público para horários fora do expediente

### Para Profissionais
- Acesse prontuário antes do atendimento
- Use fotos para documentar evoluções
- Configure questionários para coleta padronizada

### Para Gestão
- Use relatórios para tomada de decisão
- Configure comissões para motivar equipe
- Mantenha estoque atualizado para evitar faltas

---

## 🔐 Segurança e Backup

### Backup Manual
```
1. Pare o servidor (Ctrl+C)
2. Copie pasta storage/
3. Exporte banco MySQL
4. Copie arquivo .env
5. Armazene em local seguro
```

### Restauração
```
1. Instale sistema limpo
2. Restaure banco MySQL
3. Copie storage/ de volta
4. Restaure .env
5. Reinicie sistema
```

---

## 🎓 Aprendizado Progressivo

### Semana 1
- [ ] Aprender interface básica
- [ ] Fazer primeiros agendamentos
- [ ] Cadastrar clientes iniciais

### Semana 2
- [ ] Configurar serviços completos
- [ ] Usar prontuários digitais
- [ ] Registrar evoluções

### Semana 3
- [ ] Configurar comunicações
- [ ] Implementar lembretes
- [ ] Usar relatórios básicos

### Semana 4
- [ ] Agendamento público
- [ ] Relatórios avançados
- [ ] Otimizar processos

---

**Pronto para usar! Acesse http://localhost:3000 e comece hoje mesmo.** 🚀