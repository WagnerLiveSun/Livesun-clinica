# Registro de validação

- Em 18/08/2026, a tela de acesso foi verificada visualmente no ambiente de desenvolvimento.
- Uma configuração legada com o texto `Bronze Rosado` estava sendo aplicada como valor CSS inválido, deixando a ação primária transparente. A aplicação agora normaliza esse valor para `#A0522D` antes de atualizar as variáveis do tema.
- A ação **Entrar no sistema** passou a ter fundo sólido marrom, texto branco e contraste visual adequado.
- A suíte Vitest foi executada após a correção: 20 arquivos aprovados, 75 testes aprovados e 1 teste ignorado.
