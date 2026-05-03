# 🏢 Tá na Mão v2.0 — Guia de Instalação Completo

Sistema SaaS de Gestão de Condomínios com backend real (Node.js + Prisma + PostgreSQL) e frontend React.

---

## ⚡ Início Rápido (4 passos)

### 1. PostgreSQL via Docker
```bash
docker run --name tanamaao-db \
  -e POSTGRES_PASSWORD=senha123 \
  -e POSTGRES_DB=tanamaao \
  -p 5432:5432 -d postgres:16
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Edite .env se necessário
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```
API em: **http://localhost:3001**

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
App em: **http://localhost:5173**

### 4. Acessar
| Perfil  | Email                      | Senha    |
|---------|----------------------------|----------|
| Admin   | admin@horizonte.com        | senha123 |
| Síndico | sindico@horizonte.com      | senha123 |
| Morador | joao@email.com             | senha123 |

---

## 📁 Estrutura

```
tanamaao-v2/
├── backend/
│   ├── prisma/schema.prisma        # 15 modelos de banco
│   ├── src/
│   │   ├── server.js               # Express + todas as rotas
│   │   ├── lib/
│   │   │   ├── prisma.js           # Singleton Prisma Client
│   │   │   └── seed.js             # Dados iniciais completos
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT + controle por perfil
│   │   │   └── errorHandler.js     # Handler global de erros
│   │   ├── routes/
│   │   │   ├── auth.js             # Login, me, CRUD usuários
│   │   │   ├── manutencao.js       # Manutenções + checklist
│   │   │   ├── chamado.js          # Chamados + histórico + WhatsApp
│   │   │   ├── documento.js        # Upload real de arquivos
│   │   │   ├── voz.js              # Sugestões + votação
│   │   │   ├── banner.js           # Banners do portal
│   │   │   ├── inventario.js       # Equipamentos
│   │   │   ├── denuncia.js         # Canal anônimo
│   │   │   ├── comunicado.js       # Avisos gerais
│   │   │   ├── notificacao.js      # Notificações in-app
│   │   │   ├── whatsapp.js         # Config Z-API + logs + envio
│   │   │   ├── financeiro.js       # Taxas + inadimplência
│   │   │   ├── reserva.js          # Espaços comuns + reservas
│   │   │   ├── relatorio.js        # HTML para PDF (5 relatórios)
│   │   │   └── dashboard.js        # Stats + alertas de vencimento
│   │   └── jobs/agendador.js       # Jobs automáticos (alertas, taxas)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   └── App.jsx                 # App completo (todas as páginas)
│   ├── index.html
│   ├── vite.config.js
│   ├── .env
│   └── package.json
│
└── README.md
```

---

## 🗄️ Modelos do Banco (15 tabelas)

| Tabela           | Descrição                                      |
|------------------|------------------------------------------------|
| Condominio       | Multi-tenant — cada condomínio isolado          |
| User             | Admin / Síndico / Morador com JWT              |
| Manutencao       | Preventiva/Corretiva com checklist e fotos     |
| Chamado          | Tickets com histórico automático               |
| HistoricoChamado | Auditoria de cada mudança de status            |
| Documento        | Metadados + arquivo real em disco              |
| VozMorador       | Sugestões para assembleia                      |
| Voto             | Unique(userId, vozId) — sem duplicata          |
| Comentario       | Comentários em sugestões                       |
| Inventario       | Equipamentos com histórico de manutenção       |
| Banner           | Banners do carrossel do portal                 |
| Denuncia         | Anônima — sem FK para User                     |
| Comunicado       | Avisos gerais com emoji e fixado               |
| Notificacao      | Notificações in-app por usuário                |
| WhatsAppLog      | Histórico de mensagens enviadas                |
| ConfigWhatsApp   | Config Z-API por condomínio                    |
| Taxa             | Cobranças mensais + status de pagamento        |
| EspacoComum      | Salão, churrasqueira, quadra…                  |
| Reserva          | Reservas com controle de conflito de horário   |

---

## 🔌 Todos os Endpoints

```
Auth
  POST   /api/auth/login
  GET    /api/auth/me
  GET    /api/auth/users
  POST   /api/auth/users
  PATCH  /api/auth/users/:id

Dashboard
  GET    /api/dashboard

Manutenções
  GET/POST        /api/manutencoes
  GET/PATCH/DEL   /api/manutencoes/:id

Chamados
  GET/POST        /api/chamados
  GET/PATCH       /api/chamados/:id

Documentos
  GET             /api/documentos
  POST            /api/documentos          (multipart/form-data)
  DELETE          /api/documentos/:id

Voz do Morador
  GET/POST        /api/voz
  POST            /api/voz/:id/votar
  POST            /api/voz/:id/comentar

Banners
  GET/POST        /api/banners
  PATCH/DEL       /api/banners/:id

Inventário
  GET/POST        /api/inventario
  PATCH           /api/inventario/:id

Denúncias
  POST            /api/denuncias           (sem auth)
  GET             /api/denuncias           (admin/síndico)
  PATCH           /api/denuncias/:id/lida

Comunicados
  GET/POST        /api/comunicados
  DELETE          /api/comunicados/:id

Notificações
  GET             /api/notificacoes
  PATCH           /api/notificacoes/:id/lida
  PATCH           /api/notificacoes/marcar-todas-lidas

WhatsApp
  GET             /api/whatsapp/config
  POST            /api/whatsapp/config
  POST            /api/whatsapp/testar
  POST            /api/whatsapp/enviar
  GET             /api/whatsapp/logs
  GET             /api/whatsapp/stats

Financeiro
  GET             /api/financeiro/taxas
  POST            /api/financeiro/taxas
  PATCH           /api/financeiro/taxas/:id
  GET             /api/financeiro/resumo
  GET             /api/financeiro/historico

Reservas
  GET             /api/reservas/espacos
  POST            /api/reservas/espacos
  GET/POST        /api/reservas
  PATCH           /api/reservas/:id
  GET             /api/reservas/disponibilidade

Relatórios (retornam HTML para impressão/PDF)
  GET             /api/relatorios/manutencoes
  GET             /api/relatorios/chamados
  GET             /api/relatorios/financeiro
  GET             /api/relatorios/inventario
  GET             /api/relatorios/moradores
  GET             /api/relatorios/dados       (JSON para gráficos)

Jobs
  GET             /api/jobs/executar          (trigger manual)
  GET             /api/jobs/status
```

---

## ⚙️ Variáveis de Ambiente (backend/.env)

```env
DATABASE_URL="postgresql://postgres:senha123@localhost:5432/tanamaao"
JWT_SECRET="troque-em-producao"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

---

## 🚀 Deploy em Produção

### Backend → Railway ou Render
1. Conectar repositório
2. Setar variáveis de ambiente
3. Build command: `npm install && npx prisma generate && npx prisma migrate deploy`
4. Start: `node src/server.js`

### Banco → Supabase (free tier)
1. Criar projeto em supabase.com
2. Copiar connection string para `DATABASE_URL`

### Frontend → Vercel ou Netlify
1. Build: `npm run build`
2. Output: `dist/`
3. Setar `VITE_API_URL` para a URL do backend

### WhatsApp (Z-API)
1. Criar conta em z-api.io
2. Criar instância e escanear QR Code
3. Inserir API Key e Instance ID no painel Admin → WhatsApp

---

## 🔄 Jobs Automáticos

| Job                    | Frequência    | O que faz                              |
|------------------------|---------------|----------------------------------------|
| Alertas Manutenção     | A cada hora   | Notifica admins sobre vencimentos      |
| Taxas Atrasadas        | A cada 6h     | Marca PENDENTE→ATRASADO automaticamente|
| Notificar Inadimplentes| Toda segunda  | Envia WhatsApp para moradores em atraso|
| Limpar Notificações    | A cada 24h    | Remove notificações lidas > 60 dias    |
