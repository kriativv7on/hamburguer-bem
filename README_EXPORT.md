# Hambúrguer Bem — código-fonte

Cardápio digital + painel de gestão da Hambúrguer Bem (React + TypeScript + Tailwind + Express + SQLite).

## Executar localmente

```bash
pnpm install
pnpm dev
```

O Vite serve o frontend (porta 3000, ou a próxima disponível) e já monta a API Express (`/api/*`). Os dados ficam em `data/hamburguer-bem.db` (SQLite nativo do Node, `node:sqlite`). Na primeira execução o banco é criado e populado com o cardápio e 8 mesas.

## Produção

```bash
pnpm build   # frontend em dist/public + servidor bundle em dist/index.js
NODE_ENV=production PORT=3000 node dist/index.js
```

## Funcionalidades

- Cardápio digital com carrinho e checkout real (Delivery / Mesa / Balcão), pagamento informado (Pix, cartão ou dinheiro) e seleção de mesa.
- Seção de avaliações com envio direto do cliente.
- Painel administrativo em `/admin` (PIN padrão: `1234`, mude com a env `ADMIN_PIN`):
  - Visão geral (dashboards de vendas, ticket médio, top produtos, gráfico dos últimos dias).
  - Pedidos (PDV): fila por status, avanço de status e cancelamento.
  - Mesas e comandas: ocupar, reservar e liberar, com total em aberto por mesa.
  - Clientes: busca, histórico e programa de pontos.
  - Avaliações: moderação/remoção.
  - Controle de caixa: entradas, saídas, suprimentos e sangrias.

## Extras para ativar

- Troque o PIN padrão em produção definindo `ADMIN_PIN`.
- Substitua as rotas temporárias de pagamento por uma integração real (Mercado Pago/PagSeguro) em `server/api.ts`.
- Autentique o WhatsApp real no handler demonstrativo do rodapé (`client/src/pages/Home.tsx`).