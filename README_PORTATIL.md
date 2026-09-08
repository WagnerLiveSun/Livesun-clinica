# LiveSun Clinicas - Versão Portátil Windows

## Visão Geral

Esta é uma versão portátil do LiveSun Clinicas que roda localmente no Windows. O sistema funciona como um servidor web acessível pelo navegador em `http://localhost:3000`.

## Mudanças da versão executável

Devido a limitações técnicas com o empacotamento SEA do Node.js 24 e problemas de cache do pkg, esta versão portátil utiliza o Node.js instalado no sistema em vez de um executável independente. Esta abordagem oferece:

- Maior estabilidade e compatibilidade
- Menor tamanho do pacote distribuído
- Facilidade de manutenção e atualização
- Compatibilidade garantida com Node.js 20+

## Arquivos principais

- `instalar-portatil.bat`: Script de instalação inicial
- `verificar-mysql.bat`: Script para verificar instalação do MySQL
- `criar-banco.bat`: Script para criar o banco de dados automaticamente
- `iniciar-portatil.bat`: Script para iniciar o servidor
- `dist/index.js`: Servidor compilado (requer Node.js)
- `database/sunset_schema_mysql.sql`: Esquema do banco de dados
- `config/local.env.template`: Template de configuração

## Requisitos

- Windows 10 ou superior
- Node.js 20 ou superior (https://nodejs.org/)
- MySQL 8.0 ou superior
- Navegador atualizado

## Instalação rápida

1. Instale o Node.js 20+ em https://nodejs.org/
2. Extraia este ZIP em uma pasta permanente
3. Execute `instalar-portatil.bat`
4. Configure o arquivo `.env` criado
5. Crie o banco MySQL usando o script `database/sunset_schema_mysql.sql`
6. Execute `iniciar-portatil.bat`
7. Acesse `http://localhost:3000` no navegador

## Suporte

Para dúvidas ou problemas, consulte o arquivo `INSTALACAO_EXECUTAVEL_WINDOWS.md` para documentação detalhada.