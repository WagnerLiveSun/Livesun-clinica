# SunSet

## Operação compacta e gestão segura de dados

- [x] Corrigir a sobreposição dos campos de filtro em Contas a receber nas larguras intermediárias com grade adaptativa por espaço disponível
- [ ] Validar explicitamente a seção Contas a receber nas larguras desktop, intermediária e móvel, com os filtros visíveis e sem sobreposição
- [ ] Comprovar na tela financeira autenticada a grade adaptativa após a correção, antes de considerar o problema de sobreposição definitivamente encerrado
- [ ] Impedir que o quinto filtro seja cortado no cartão de Contas a receber quando a área financeira estiver ao lado de Despesas recentes
- [ ] Reabrir Contas a receber autenticado ao lado de Despesas recentes após a última alteração e confirmar que o quinto filtro não é cortado
- [ ] Capturar evidência verificável da tela financeira real nas larguras desktop, intermediária e móvel após a correção final
- [x] Substituir a distribuição automática por quebras fixas seguras no cartão financeiro, impedindo cinco filtros em uma linha estreita
- [x] Registro histórico: a publicação antecipada foi solicitada pelo usuário antes da validação autenticada da seção financeira
- [x] Publicar a correção responsiva por solicitação expressa do usuário, mantendo a validação autenticada complementar pendente
- [x] Reforçar a grade dos filtros com dimensionamento pelo contêiner disponível, evitando que a barra lateral reduza colunas abaixo da largura segura
- [x] Compactar filtros de contas a receber e reduzir a ênfase visual das ações
- [x] Exibir uma ação de recebimento discreta por registro, sem ocupar toda a largura da lista
- [x] Disponibilizar edição e exclusão confirmada para cadastros operacionais
- [x] Criar limpeza de dados exclusiva do gestor com autenticação por senha e confirmação explícita
- [x] Preservar usuários, acesso, configurações e dados legais da clínica durante a limpeza
- [x] Cobrir edição, exclusão e limpeza protegida com testes automatizados
- [x] Comprovar o diálogo de confirmação reutilizado e o vínculo completo das ações de edição e arquivamento de clientes, serviços e profissionais
- [x] Adicionar testes explícitos para edição e arquivamento de clientes e validar o escopo por clínica nos cadastros operacionais
- [x] Limpar os dados operacionais da clínica: clientes, agenda, prontuários, anexos, respostas, financeiro, despesas, recebimentos, comissões, caixa, lembretes, tokens públicos e auditoria
- [x] Preservar serviços, profissionais, salas, equipamentos e insumos durante a limpeza confirmada
- [x] Adicionar na aba Gestão, apenas para administradores, o botão manual “Limpar Dados Operacionais” e seu diálogo de confirmação por senha e frase “LIMPAR DADOS”, sem executar qualquer limpeza durante a implementação

## SaaS multi-clínica e isolamento de dados

- [x] Criar a entidade clínica como locatária do sistema e migrar com segurança os dados existentes para a clínica atual
- [x] Vincular usuários, clientes, serviços, profissionais, agenda, prontuários, fotos, questionários, financeiro, recursos, comissões e lembretes à clínica responsável
- [x] Aplicar escopo obrigatório de clínica em todas as consultas, inclusões, alterações e exclusões do servidor
- [x] Restringir a área de gestão, as configurações e a limpeza de dados ao contexto da clínica ativa
- [x] Garantir que um usuário de uma clínica nunca visualize ou altere dados de outra clínica
- [x] Cobrir o isolamento multi-clínica e as permissões administrativas com testes automatizados

## Responsividade de contas a receber

- [x] Validar a lista de contas a receber em largura intermediária e estreita, confirmando que a ação não é cortada
- [x] Cobrir em teste a regra exclusiva que posiciona a ação de recebimento em uma linha própria
- [x] Publicar a correção responsiva para validação do usuário
- [x] Diagnosticar e corrigir o bloqueio de navegação após o login

## Operação de contas a receber

- [x] Exibir por padrão apenas títulos em aberto, incluindo pagamentos parciais e pendências de atendimentos confirmados
- [x] Adicionar filtros por cliente, situação, período e etapa do atendimento
- [x] Reorganizar cada título para manter saldo, identificação e ação de recebimento sempre visíveis
- [x] Eliminar a necessidade de rolagem horizontal para registrar um recebimento
- [x] Adicionar testes automatizados específicos para filtros de contas a receber e títulos abertos por padrão
- [x] Comprovar em teste que a ação “Registrar recebimento” permanece visível na lista operacional

## Contraste de ações financeiras

- [x] Reforçar o contraste do botão “Pagar despesa” em qualquer cor de tema
- [x] Atualizar automaticamente a comissão após o recebimento e oferecer uma ação manual de atualização no painel

## Assinatura LiveSun no rodapé

- [x] Aumentar e tornar visível o logotipo da LiveSun na assinatura de rodapé
- [x] Remover o texto “LiveSun Tecnologia” e manter apenas a identificação “Desenvolvido por”

## Cadastro completo e tema da clínica

- [x] Restaurar e preservar o design com fundo WebGL aprovado, corrigindo somente contraste e legibilidade
- [x] Substituir a grade de cores grande por ícones hexagonais discretos, visíveis somente ao acionar “Alterar o tema”
- [x] Manter a escolha de cor exclusivamente visual e salvar internamente a cor selecionada
- [x] Ampliar o cadastro da clínica com razão social, nome fantasia, CNPJ, segmento, contatos e endereço completo
- [x] Persistir e validar os novos dados empresariais e operacionais no banco de dados
- [x] Exibir o formulário de identificação completo somente para o perfil gestor
- [x] Restringir explicitamente o formulário completo de identificação ao perfil gestor na interface e cobrir a regra em teste
- [x] Validar CNPJ, CEP, UF e contatos e comprovar a leitura e gravação dos novos dados cadastrais

## Concluído

- [x] Configurar esquema de banco de dados no Drizzle (clientes, usuários, serviços, equipamentos, sessões, questionários, contas a receber, recebimentos, auditoria, lembretes)
- [x] Implementar rotas de backend (tRPC) para autenticação e perfis de acesso (admin, recepcao, profissional, cliente, user)
- [x] Implementar rotas de backend para gestão de clientes, histórico e fotos clínicas (S3)
- [x] Implementar rotas de backend para agendamentos avançados com status e controle de conflitos
- [x] Implementar rotas de backend para questionários de anamnese versionados e assinaturas digitais
- [x] Implementar rotas de backend para procedimentos, serviços e equipamentos
- [x] Implementar rotas de backend para módulo financeiro (receitas, despesas, caixa, comissões)
- [x] Implementar rotas de backend para prontuário eletrônico e evolução de sessões
- [x] Desenvolver interface visual com sidebar lateral, paleta rosé/dourado clean e moderna (DM Serif Display + Inter)
- [x] Criar Dashboard com indicadores (faturamento, ocupação, agendamentos do dia, aniversariantes)
- [x] Criar portal do cliente para agendamento próprio e visualização de histórico
- [x] Criar painel da recepção para confirmação de presença e recebimentos
- [x] Criar painel do profissional para histórico de sessões e anamnese
- [x] Criar painel do gestor para configurações, relatórios e permissões
- [x] Escrever testes unitários em Vitest para validação das principais rotas (29/29 passando)
- [x] Reconciliar as migrações com o banco existente e restaurar a compatibilidade do usuário técnico do sistema
- [x] Aplicar autorização por perfil em cada procedimento do sistema
- [x] Implementar prontuário estruturado com fotos protegidas e evolução por sessão
- [x] Completar o financeiro com despesas, caixa diário e visão de comissões
- [x] Criar uma experiência dedicada para o portal do cliente autenticado
- [x] Estruturar a fila de lembretes para posterior integração com um canal oficial de comunicação
- [x] Layout responsivo validado (desktop 1280px e mobile 375px)

## Próximas melhorias sugeridas

- [x] Implementar e testar a validação de conflitos de agendamento por profissional, sala e intervalo de horário
- [x] Adicionar tela administrativa para criar e editar equipamentos consumindo as rotas de recursos
- [x] Implementar lógica real de questionários pendentes no portal e reforçar a assinatura nominal de aceite
- [x] Criar área do gestor para gestão de perfis e relatórios administrativos verificáveis
- [x] Adicionar testes para consulta e transição de status da fila de lembretes
- [x] Integrar o envio de lembretes por e-mail via Brevo com fila idempotente, controle de falha e callback protegido
- [x] Publicar o site e ativar o agendamento recorrente para processar a fila de lembretes Brevo (a cada 5 minutos; tarefa h4ng6fuCJgjMSPSJidXwfj)
- [x] Corrigir a consulta do portal do cliente que é executada indevidamente para perfis internos
- [x] Reorganizar o calendário semanal por profissional, sala ou procedimento e validar a lógica de agrupamento
- [x] Implementar relatório de comissões exportável em PDF
- [x] Criar módulo de controle de estoque de insumos com alertas de mínimo
- [x] Migrar o acesso da plataforma para login local com e-mail e senha
- [x] Criar recuperação de senha por e-mail com tokens de uso único
- [x] Criar tela de entrada local e remover chamadas diretas ao login integrado
- [x] Adaptar a administração de usuários para criar credenciais e perfis internos
- [x] Cobrir e validar os fluxos de login, bloqueio, logout e redefinição de senha
- [x] Garantir bootstrap protegido pela recuperação de senha vinculada ao e-mail do gestor, sem expor credenciais iniciais
- [x] Adicionar testes automatizados de login bem-sucedido, logout, bloqueio por usuário inativo e redefinição com reutilização de token proibida
- [x] Adicionar validação automatizada do bootstrap do gestor por recuperação de senha quando não houver credenciais locais ativas
- [x] Criar portal público de autoagendamento acessível por link compartilhável
- [x] Implementar cadastro público do cliente com consentimento e preferência de comunicação
- [x] Vincular anamnese obrigatória ao cadastro e registrar a assinatura antes do agendamento
- [x] Permitir escolha de serviço, profissional quando aplicável, data e horário disponíveis pelo portal
- [x] Garantir confirmação e lembrete por e-mail, com fallback explícito quando o cliente preferir WhatsApp ou SMS enquanto esses canais permanecem desativados
- [x] Validar a experiência pública em telas móveis e desktop
- [x] Implementar seleção de horários baseada em disponibilidade real, com estados de carregamento, vazio e erro no portal público
- [x] Adicionar cobertura verificável para os contratos e a responsividade do fluxo público de autoagendamento
- [x] Adicionar testes verificáveis para cadastro, anamnese, disponibilidade e solicitação do autoagendamento público
- [x] Registrar evidência automatizada ou assertiva da responsividade do portal público
- [x] Documentar e preparar remetentes e modelo Brevo para ativação futura de WhatsApp e SMS, aguardando pré-requisitos e autorização do usuário
- [x] Manter WhatsApp e SMS desativados até que o usuário forneça os pré-requisitos Brevo e autorize a ativação
- [x] Atualizar a marca visível do sistema para SunSet (histórico)
- [x] Inserir crédito de desenvolvimento LiveSun Tecnologia com o logotipo institucional
- [x] Corrigir a opacidade e o contraste do modal de agendamento e revisar os demais diálogos operacionais
- [x] Corrigir o carregamento e a seleção de profissionais por serviço no autoagendamento público
- [x] Validar que a seleção de profissional atualiza os horários disponíveis no autoagendamento
- [x] Exibir estado vazio e orientação de cadastro quando não houver profissionais ativos vinculados a serviços
- [x] Criar uma validação integrada com profissional ativo vinculado a serviço publicado e comprovar o carregamento real do seletor
- [x] Executar e registrar teste sem mocks do fluxo serviço, profissional e horários em ambiente isolado
- [x] Criar e executar teste integrado isolado sem interceptar a API pública para cobrir serviço, profissional e horários
- [x] Registrar no acompanhamento a evidência do teste integrado real após sua execução bem-sucedida
- [x] Evidência registrada: `server/publicBooking.live.integration.test.ts` aprovado isoladamente (1 teste) e na suíte completa (49 aprovados, 1 ignorado), com 5 testes E2E aprovados
- [x] Permitir que gestores editem nome, descrição, duração, valor e status de serviços cadastrados com validação e preservação do histórico
- [x] Corrigir a formatação de data e hora nas confirmações e lembretes para refletir o horário local selecionado pelo cliente
- [x] Criar relatórios visualizáveis e imprimíveis de contas a pagar, contas a receber, pagamentos, recebimentos e serviços por período
- [x] Validar e publicar a edição de procedimentos no menu Serviços para uso imediato do gestor
- [x] Aplicar a formatação regional de horário a todos os lembretes restantes e cobrir o texto final com testes
- [x] Propagar o fuso do navegador e gerar mensagens de confirmação e lembrete no fluxo autenticado do portal do cliente
- [x] Cobrir por teste os textos finais das mensagens para cliente e equipe nos fluxos público e autenticado
- [x] Salvar e registrar a versão publicada da edição de procedimentos após os testes aprovados
- [x] Validar o relatório financeiro por período: 55 testes de lógica aprovados e 4 testes E2E administrativos aprovados
- [x] Manter o subdomínio sunset.livesun.com.br sem alteração, conforme decisão do usuário de não habilitar domínio personalizado no plano atual
- [x] Gerar e disponibilizar um script SQL MySQL completo para criação do esquema do SunSet em ambiente próprio
- [x] Preparar e disponibilizar o pacote ZIP completo do código-fonte, com estrutura preservada, configuração de exemplo e inicialização local por arquivo .bat
- [x] Diagnosticar a entrega dos e-mails de recuperação e primeiro acesso; Brevo registrou entrega, e o uso do fluxo correto foi esclarecido ao usuário
- [x] Validar e documentar o comportamento do autoagendamento quando o cliente seleciona WhatsApp ou SMS enquanto somente e-mail está ativo
- [x] Implementar e testar fallback explícito para e-mail ou aviso de indisponibilidade de canais não ativos no cadastro público
- [x] Separar dinheiro, PIX e cartão nos recebimentos, registrar liquidação de cartão e excluir valores não liquidados do caixa disponível
- [x] Atualizar os KPIs financeiros para separar caixa em dinheiro, PIX disponível, cartão pendente e recebimentos liquidados
- [x] Tornar o teste integrado do autoagendamento independente do nome de um procedimento operacional editável
- [x] Verificar o perfil, status e vínculos de serviço publicados do profissional João Roberto no seletor público
- [x] Comprovar visualmente em /agendar que Bronzemento libera João Roberto no seletor e retorna horários reais sem conflito
- [x] Disponibilizar ao gestor a consulta das anamneses respondidas de cada cliente, incluindo respostas e assinatura
- [x] Validar que apenas perfis internos autorizados visualizam as anamneses dos clientes
- [x] Corrigir transparência e contraste de diálogos e menus suspensos para preservar a legibilidade
- [x] Validar visualmente os modais e seletores em desktop e mobile após a correção de contraste
- [x] Abrir e validar um modal real e um seletor real no cadastro interno, em desktop e mobile, registrando a legibilidade dos estados sobrepostos
- [x] Adicionar teste E2E que abra o diálogo de usuário interno e seu seletor de perfil, verificando as superfícies opacas
- [x] Estender o teste E2E do diálogo interno para manter ou reabrir modal e seletor no viewport móvel, verificando fundo sólido, opacidade e legibilidade
- [x] Capturar e revisar visualmente o diálogo de usuário e o seletor de perfil abertos em desktop e mobile
- [x] Corrigir transparência e contraste nas quatro etapas do autoagendamento público do cliente
- [x] Validar cartões, formulários, avisos e seletores do autoagendamento em estados preenchidos e abertos
- [x] Adicionar teste E2E do autoagendamento que percorra as etapas preenchidas e abra um seletor real, validando fundos opacos
- [x] Registrar validação visual ou automatizada das etapas de anamnese, escolha de horário e confirmação em estados preenchidos

## Comissão por profissional

- [x] Definir e armazenar regras variáveis de comissão por profissional, incluindo modalidade percentual, valor fixo e status ativo de vigência operacional imediata
- [x] Aplicar as regras de comissão aos atendimentos concluídos sem alterar registros financeiros históricos já gerados
- [x] Disponibilizar ao gestor uma interface para configurar as regras de comissão de cada profissional por procedimento
- [x] Exibir e filtrar as comissões calculadas nos relatórios financeiros existentes
- [x] Cobrir regras, permissões, interface e relatório de comissões com testes automatizados
- [x] Respeitar o status ativo da regra no cálculo de comissões de sessões concluídas posteriormente
- [x] Cobrir por teste a desativação de regra e a ausência de nova comissão para a regra inativa

## Baixa de comissões

- [x] Criar transição financeira controlada de comissão pendente para paga, com data de pagamento
- [x] Permitir ao gestor baixar uma comissão individualmente ou selecionar várias comissões pendentes para baixa em lote
- [x] Atualizar relatórios e indicadores imediatamente após a baixa de comissões
- [x] Cobrir permissões, transições idempotentes e controles de interface com testes automatizados

## Integridade entre comissão e autoagendamento

- [x] Separar o status da regra de comissão da disponibilidade do vínculo profissional-procedimento no autoagendamento
- [x] Restaurar a disponibilidade pública do profissional vinculado sem reativar a regra de comissão que tenha sido desativada
- [x] Cobrir com teste a independência entre comissão inativa e agenda pública ativa
- [x] Testar o sucesso individual e em lote da baixa de comissão, incluindo persistência de status e data de pagamento
- [x] Testar a baixa de comissão pela interface com atualização imediata da tabela e do relatório financeiro
- [x] Comprovar por teste que comissão inativa não bloqueia o vínculo público ativo nem gera nova comissão
- [x] Cobrir a mutation de baixa com adaptador de persistência e verificar status PAGA e data de pagamento
- [x] Estender o teste de interface para verificar o reflexo visual da baixa e a atualização do relatório
- [x] Testar a mutation financeira de pagamento de comissão por meio do caller administrativo com persistência simulada
- [x] Confirmar no teste de interface a troca visível para PAGA e a data após a confirmação simulada
- [x] Usar os dados submetidos na mutation para atualizar imediatamente a tabela e o relatório de comissão
- [x] Completar a migração da separação de comissão e agenda com a criação da coluna de status exclusivo para instalações novas
- [x] Verificar o script para novas instalações e consultar a estrutura não destrutiva já aplicada no banco operacional
- [x] Testar automaticamente que a migração cria a coluna de comissão antes de preservar o status dos vínculos existentes

## Evolução da identidade do produto

- [x] Pesquisar e propor nomes elegantes, genéricos e contemporâneos para negócios de estética, sem referência a sistema, gestão ou clínica
- [x] Validar a escolha do novo nome com o usuário antes de alterar a identidade no produto
- [x] Substituir a marca SunSet pelo nome temporário aprovado nos textos, títulos e fluxos do sistema
- [x] Validar e publicar a identidade temporária sem alterar as funcionalidades existentes
- [x] Salvar checkpoint e publicar a renomeação temporária, registrando a versão final `2ab35f32`
- [x] Confirmar na produção os textos públicos e, pela suíte transacional da versão publicada, as mensagens de e-mail da identidade temporária

## Refinamento visual da identidade temporária

- [x] Separar visualmente o símbolo, o nome temporário e o slogan com espaçamento e alinhamento adequados
- [x] Ajustar a hierarquia tipográfica da assinatura de marca para leitura clara em desktop e mobile
- [x] Validar a composição refinada da marca em desktop e mobile
- [x] Publicar a composição refinada da marca temporária
- [x] Verificar por teste o espaçamento e a organização vertical da assinatura temporária em desktop e mobile
- [x] Estabilizar o teste de baixa de comissão com dados simulados para que a validação visual não dependa de registros pendentes no banco operacional
- [x] Salvar checkpoint e publicar o refinamento visual da marca temporária
- [x] Confirmar em produção a nova composição da marca nas telas de acesso e de autoagendamento

## Correção do padrão de fundo animado

- [x] Analisar o componente anexado e identificar por que o padrão não aparece nas rotas atuais
- [x] Integrar o padrão animado fornecido à camada de fundo de login, painel e autoagendamento
- [x] Conectar as cores do padrão à cor primária configurada pela clínica
- [x] Validar visualmente as três rotas antes da publicação

## Consolidação da marca SunSet

- [x] Remover referências residuais a Aura em código, testes, configuração, documentação e artefatos de inicialização local
- [x] Renomear o script de criação local de banco para SunSet sem alterar o banco operacional existente

## Correção de navegação

- [x] Verificar o possível bloqueio de navegação: não reproduzido no fluxo de recuperação de acesso; o canvas de fundo permanece inerte (`pointer-events: none`)
- [x] Preservar a camada temática sem interceptar interações: nenhum ajuste adicional foi necessário após a verificação
- [x] Validar a navegação nas rotas de acesso, painel e autoagendamento: confirmação de funcionamento recebida do usuário em 18/08/2026

## Publicação solicitada

- [x] Publicar a versão SunSet com o padrão animado e a navegação confirmada pelo usuário

## Refinamento de legibilidade do painel

- [x] Avaliar menu lateral, conteúdo e tabelas que perdem contraste sobre o fundo temático
- [x] Aplicar superfícies de leitura, navegação ativa e controles com contraste consistente
- [x] Melhorar a hierarquia e a distribuição do conteúdo do painel em desktop e mobile
- [x] Validar visualmente o painel com a cor personalizada da clínica antes de publicar

## Recebimento com múltiplas formas de pagamento

- [x] Modelar itens de pagamento vinculados a um recebimento e ao título financeiro do procedimento
- [x] Persistir formas e valores independentes, incluindo dinheiro, PIX, débito e crédito
- [x] Impedir que a soma das formas ultrapasse o saldo a pagar do procedimento
- [x] Atualizar o modal e o histórico para detalhar cada forma utilizada no recebimento
- [x] Cobrir o novo fluxo financeiro com testes automatizados e validá-lo antes de publicar

## Navegação de agendamentos

- [x] Tornar os cartões de agendamento acionáveis
- [x] Abrir o processo relacionado com cliente, serviço, profissional, horário, status, prontuário e financeiro
- [x] Validar a navegação no painel antes de publicar

## Correção prioritária de contraste

- [x] Identificar as áreas de agenda, menu e conteúdo que estão ocultando botões ou reduzindo a leitura dos textos
- [x] Reforçar a superfície de conteúdo e do menu, preservando o fundo temático apenas como apoio visual
- [x] Garantir contraste acessível em botões primários, textos, seleção de menu e controles da agenda
- [x] Validar visualmente a agenda e o painel antes de publicar

## Retorno à identidade SunSet

- [x] Restaurar SunSet como nome visível, título configurado e assinatura das comunicações do produto
- [x] Corrigir a assinatura compacta para separar semanticamente nome e slogan, sem depender apenas de espaços visuais
- [x] Validar SunSet e o espaçamento da assinatura em acesso, autoagendamento, desktop e mobile — 75 testes Vitest aprovados (1 ignorado) e 12 testes E2E aprovados
- [x] Publicar o retorno à identidade SunSet e confirmar a versão pública — domínio publicado confirmado com SunSet e slogan nas rotas `/` e `/agendar`
- [x] Executar busca final por referências à identidade anterior e padronizar os textos SunSet remanescentes
- [x] Confirmar que todas as assinaturas compactas usam a mesma estrutura semântica de nome e slogan
- [x] Exibir e validar a assinatura SunSet com nome e slogan também na tela de acesso, em desktop e mobile — teste E2E cobre os dois viewports, a separação vertical e a ausência de rolagem horizontal
- [x] Registrar uma validação E2E específica da separação vertical da assinatura nas rotas públicas — 12 testes E2E aprovados, incluindo nome, slogan, empilhamento vertical e ausência de rolagem horizontal

## Novas Funcionalidades Solicitadas

- [x] Criar tabela de configuração da clínica (tenant settings) no Drizzle schema (nome, slogan, logo URL, cores primária/secundária, endereço comercial, telefone, CNPJ)
- [x] Implementar painel exclusivo para o gestor configurar e personalizar a clínica (marca, cores, logo, dados comerciais) com salvamento em tempo real
- [x] Atualizar o portal público de autoagendamento (`/agendar`) para ocultar ou desabilitar visualmente os horários já ocupados por agendamentos existentes, impedindo seleções conflitantes
- [x] Adicionar suporte a pagamento parcial antecipado no agendamento (ex: 50% online / 50% restante na clínica), com registro financeiro separado (entrada/sinal vs saldo a receber)
- [x] Cobrir as novas funcionalidades com testes automatizados e validar o sistema
- [x] Aplicar cor primária dinâmica via CSS custom property na raiz da aplicação
- [x] Exibir o nome do sistema "SunSet" como plataforma e o nome comercial configurado pelo gestor

## Paleta visual de cores

- [x] Substituir a entrada de código hexadecimal por uma paleta de cores selecionável
- [x] Indicar claramente a cor escolhida e aplicar a prévia ao tema da clínica
- [x] Preservar a cor já personalizada nas configurações existentes
- [x] Garantir contraste de texto e ícones em itens, botões e controles selecionados
- [x] Corrigir o estado destacado dos menus suspensos que referencia uma variável de cor inexistente
- [x] Remover definitivamente qualquer campo textual de cor e deixar somente a paleta visual selecionável

## Próximas entregas do fluxo clínico

- [x] Permitir várias linhas de recebimento no mesmo registro financeiro, com uma forma por linha
- [x] Validar a soma das linhas contra o saldo a pagar e relacionar os itens pelo grupo de pagamento
- [x] Abrir o processo do atendimento ao selecionar um cartão da agenda
- [x] Exibir no processo os dados clínicos, financeiros e as ações de prontuário, recebimento e edição
