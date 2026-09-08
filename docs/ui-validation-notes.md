# Validação visual — 18/08/2026

## Contraste do painel

O padrão de fundo configurável da clínica deve permanecer como elemento de apoio visual. As superfícies de navegação, a área principal de trabalho, tabelas, cartões e controles precisam usar fundos claros opacos e texto escuro para preservar leitura.

## Ações prioritárias

Os botões primários, incluindo **Novo agendamento**, devem usar diretamente `--primary` como fundo sólido, texto branco e borda correspondente. Isso evita a perda de cor quando o tema é configurado em hexadecimal, enquanto os controles secundários permanecem brancos com texto e borda escuros.

## Evidência disponível

O build de produção concluiu sem erro após a camada de contraste. A captura automatizada confirmou a integridade da tela de acesso; o painel autenticado deverá ser conferido no preview com sessão de gestor antes da publicação final.
