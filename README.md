# Plataforma de Compliance — Candidato Executivo (Hapvida)

Formulário público de declaração de conflitos de interesse. Front-end estático
+ função serverless (`/api/submit`) que encaminha o envio ao fluxo do Power
Automate, que grava numa SharePoint List e notifica os recrutadores.

## Deploy (Vercel)
1. Suba estes arquivos para um repositório no GitHub.
2. Vercel → New Project → Import do repositório.
3. Framework Preset: **Other** (estático, sem build). A pasta `api/` vira
   função serverless automaticamente.
4. Adicione as variáveis de ambiente (Settings → Environment Variables):
   - `FLOW_URL` = URL HTTP do gatilho do Power Automate
   - `APP_KEY`  = 0vMuq-2rrjISYf67-DBMOhN2kNV4eX4D
5. Deploy.

## Observações
- Nada sensível fica no navegador: `FLOW_URL` e `APP_KEY` só existem no servidor.
- O fluxo deve validar o campo `appKey` no corpo (mesmo valor de `APP_KEY`).
- LGPD: publique o aviso de privacidade antes de abrir ao público; nos testes,
  use dados fictícios.
