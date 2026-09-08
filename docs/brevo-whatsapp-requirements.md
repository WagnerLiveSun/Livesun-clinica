# Requisitos Brevo para mensagens transacionais por WhatsApp

O Brevo disponibiliza o endpoint transacional `POST /v3/whatsapp/sendMessage`. Para uma primeira mensagem ao cliente, o envio deve usar um modelo previamente criado e aprovado, identificado por `templateId`. A requisição também exige um `senderNumber` e os números dos destinatários, em formato internacional, sem espaços ou caracteres de formatação.

Antes de usar a API, a conta Brevo precisa ter o canal WhatsApp ativado e uma conta WhatsApp Business vinculada. O processo de vinculação exige um número exclusivo para envio, dados legais da empresa, domínio web e a conexão/criação da conta Meta Business. A verificação pela Meta pode limitar temporariamente o volume de envios.

No SunSet, o e-mail continuará sendo enviado pelo Brevo já configurado. A seleção de WhatsApp será persistida no cadastro e a integração automática ficará condicionada à ativação do canal, ao número remetente e ao modelo transacional aprovados no Brevo. SMS também depende de disponibilidade/crédito configurado na conta Brevo.

## Fontes oficiais

- [Brevo API — Mensagens WhatsApp](https://developers.brevo.com/docs/whatsapp-messages)
- [Brevo Help Center — Vincular conta WhatsApp Business](https://help.brevo.com/hc/en-us/articles/4417084910866-Part-1-Link-your-WhatsApp-Business-account-to-Brevo)
