# Script MySQL do SunSet

O arquivo `sunset_schema_mysql.sql` cria a estrutura atual do banco do SunSet em **MySQL 8.0 ou superior**, incluindo a entidade da clínica e os vínculos necessários ao isolamento multi-clínica. Ele não contém dados de pacientes, credenciais, fotos, tokens ou informações financeiras.

## Execução

Crie uma cópia do arquivo e, se necessário, troque o nome `sunset` nas linhas `CREATE DATABASE` e `USE`. Em seguida, execute:

```bash
mysql -u SEU_USUARIO -p < sunset_schema_mysql.sql
```

Para um servidor remoto, use o host e a porta fornecidos pela hospedagem:

```bash
mysql -h SEU_HOST -P 3306 -u SEU_USUARIO -p < sunset_schema_mysql.sql
```

> O script é estrutural para uma instalação vazia: usa `CREATE TABLE IF NOT EXISTS` e cria as 28 tabelas, índices e chaves únicas necessários pelo sistema. Se for executado novamente em um banco já existente, valide os índices antes de repetir a operação.

## Observações importantes

As relações entre tabelas são aplicadas pela camada da aplicação, assim como no esquema original do SunSet. Por esse motivo, o script não adiciona chaves estrangeiras novas que poderiam divergir da estrutura operacional atual. O esquema inclui `clinicas`, `clinic_settings` e `clinicaId` nas entidades operacionais para suportar o isolamento por locatário.

O sistema guarda datas e horários de operação em UTC e aplica o fuso regional do cliente apenas na apresentação das mensagens. Configure a conexão da aplicação com uma `DATABASE_URL` MySQL válida antes de iniciar o servidor.
