# CLAUDE.md — service-haules-v2

## Visão Geral

Backend de e-commerce do Bar do Haules construído com **MedusaJS v2**. Gerencia produtos, pedidos, clientes, promoções e integração com Contentful (CMS). Deploy no Railway.

**URL Produção:** `https://service-haules-production.up.railway.app`
**Admin Panel:** `https://service-haules-production.up.railway.app/app`
**Package manager:** `yarn` (nodeLinker: node-modules)

---

## Tech Stack

- **Framework:** MedusaJS v2.12.1
- **Linguagem:** TypeScript 5.6.2
- **Runtime:** Node.js 20+
- **ORM:** MikroORM 6.4.16 (PostgreSQL)
- **Database:** PostgreSQL via Supabase (`db.awftontmttecgvnkelep.supabase.co:5432`)
- **Storage:** Supabase S3-compatible (bucket `menu`)
- **CMS:** Contentful

---

## Estrutura Principal

```
src/
  api/
    admin/
      contentful/home/      # GET/POST: busca e atualiza conteúdo Contentful home
      contentful/upload/    # POST: upload de asset para Contentful
    store/custom/           # Placeholder (GET health check)

  modules/contentful/
    index.ts                # Definição do módulo Contentful
    service.ts              # ContentfulService: getHomeContent, uploadAsset, updateEntry

  workflows/
    generate-coupons-workflow.ts   # Cria user_coupons para todos os clientes
    remove-coupons-workflow.ts     # Remove user_coupons de uma promoção
    customer-hooks.ts    # Hook: assigna cupons disponíveis a novos clientes
    draft-order-hooks.ts # Hook: aplica ajustes de promoção em draft orders
    promotion-hooks.ts   # Hook: gera/remove cupons no ciclo de vida de promoções

  subscribers/
    payment-captured.ts  # Registra uso de promoção, verifica limite de usos
    user-created.ts      # Auto-cria customer para novos usuários
    user-invited.ts      # Envia e-mail de convite via Supabase Edge Functions

  admin/routes/conteudo/
    page.tsx             # UI customizada no admin para gerenciar seções do home no Contentful

  scripts/
    seed.ts              # Seed: regiões, produtos, stock, tax regions
```

---

## Workflows e Hooks

### Geração de Cupons (`generate-coupons-workflow`)
- Passo: `generate-coupons-step`
- Lista todos os clientes e cria registros em `user_coupons` (Supabase)
- Skipa clientes que já têm cupom para aquela promoção
- Respeita limite de usos da promoção

### Remove Cupons (`remove-coupons-workflow`)
- Deleta todos os `user_coupons` de uma promoção

### Hooks Registrados
| Hook | Trigger | Ação |
|------|---------|------|
| `createCustomersWorkflow.hooks.customersCreated` | Novo cliente criado | Atribui cupons de promoções ativas |
| `createOrderWorkflow.hooks.orderCreated` | Pedido criado de draft | Aplica e confirma ajustes de promoção |
| `createPromotionsWorkflow.hooks.promotionsCreated` | Promoção criada | Gera cupons para todos os clientes |
| `updatePromotionsWorkflow.hooks.promotionsUpdated` | Promoção ativada | Gera cupons |
| `deletePromotionsWorkflow.hooks.promotionsDeleted` | Promoção deletada | Remove todos os cupons |

---

## Módulo Contentful (`src/modules/contentful/service.ts`)

**ContentfulService:**
- `getHomeContent()` — busca entradas do home no Contentful, resolve assets linkados, retorna com URLs de imagem
- `uploadAsset(fileName, base64Data, mimeType)` — faz upload de imagem no Contentful Management API e publica
- `updateEntry(entryId, fields)` — atualiza campos de uma entrada e publica
- Locale padrão: `en-US`

---

## Admin UI Customizada (`src/admin/routes/conteudo/page.tsx`)

Rota: `/app/conteudo` no painel admin do Medusa.

**Funcionalidades:**
- Edição visual das seções do home page via Contentful
- **Tipos de campo suportados:**
  - Texto curto (input)
  - Texto longo (textarea com toolbar: negrito, itálico)
  - **Cor** — paleta de sugestões clicáveis + campo HEX manual; cor selecionada recebe indicativo visual
  - Toggle (boolean)
  - Array de assets (upload de imagens com remoção)
  - Array de posts com drag-and-drop para reordenar
- **Fluxo de salvar:** formata campos no padrão Contentful → POST `/admin/contentful/home` → auto-publica

**Paleta de cores disponível:** `#FFFFFF`, `#FCB010`, `#51793A`, `#5A3F8C`, `#000000`

---

## API Routes Customizadas

### Admin
- `GET /admin/contentful/home` — retorna conteúdo atual do home (via ContentfulService)
- `POST /admin/contentful/home` — atualiza entrada no Contentful e publica
- `POST /admin/contentful/upload` — recebe `{fileName, data (base64), mimeType}`, faz upload e retorna `{url, assetId}`

### Store
- `GET /store/custom` — health check placeholder

---

## Subscribers

### `payment-captured.ts`
- Escuta evento `payment.captured`
- Registra uso de promoção associada ao pedido
- Verifica se limite de usos foi atingido; se sim, chama `remove-coupons-workflow`

### `user-created.ts`
- Escuta evento de criação de usuário
- Auto-cria um `customer` no Medusa para o novo usuário

### `user-invited.ts`
- Escuta convite de usuário
- Chama Supabase Edge Function `send-email` para enviar e-mail de convite

---

## Configuração (`medusa-config.ts`)

```typescript
// Database
databaseUrl: process.env.DATABASE_URL

// Módulos principais (beyond default)
modules: [
  { resolve: './src/modules/contentful', ... }
]

// Storage: Supabase S3-compatible
// S3 bucket: "menu", region: us-east-1

// CORS
storeCors: process.env.STORE_CORS
adminCors: process.env.ADMIN_CORS
authCors: process.env.AUTH_CORS
```

---

## Build e Deploy

**Desenvolvimento:**
```bash
yarn dev           # medusa develop (hot reload)
yarn seed          # popula DB com regiões, produtos, etc.
```

**Produção (Railway):**
```bash
yarn build         # medusa build (Linux/Mac)
yarn build:windows # build + copia .env + yarn no .medusa/server (Windows)
yarn start         # medusa start (roda .medusa/server)
```

**Migrações:**
```bash
medusa db:migrate  # sincroniza links de módulos
```

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase) |
| `JWT_SECRET` | Chave JWT do Medusa |
| `COOKIE_SECRET` | Chave de sessão |
| `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` | Origens permitidas |
| `CONTENTFUL_SPACE_ID` | ID espaço Contentful |
| `CONTENTFUL_MANAGEMENT_TOKEN` | Token de gerenciamento Contentful |
| `CONTENTFUL_ENVIRONMENT` | Ambiente (`master`) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privilegiada |
| `SUPABASE_ANON_KEY` | Chave anônima |
| `S3_FILE_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Storage Supabase S3 |
| `S3_REGION`, `S3_BUCKET`, `S3_ENDPOINT` | Config S3 |
| `REDIS_URL` | Redis para workflow engine |

---

## Tabela Customizada no Supabase

**`user_coupons`** (gerenciada externamente ao Medusa):
- `customer_id` — FK para customer Medusa
- `promotion_id` — FK para promoção Medusa
- `is_redeemed: boolean`
- `created_at`

Esta tabela é usada pelos workflows de geração/remoção de cupons e pelo gateway (`validate-discount`, `complete-purchase`).

---

## Seed Data (`src/scripts/seed.ts`)

Cria ao rodar `yarn seed`:
- Regiões: Europa (GB, DE, DK, SE, FR, ES, IT) — moeda EUR + USD
- Stock Location padrão
- Sales Channel padrão
- Tax Regions
- Produtos iniciais com variantes e preços
