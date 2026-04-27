
# Painel Admin Lavgo (/admin)

Reconstruir a página `/admin` (hoje placeholder com valores fixos) num painel real, acessível **somente para `rafael.silva.eh@gmail.com`**, com métricas vindas do banco, gestão de usuários, diagnóstico WhatsApp, configurações editáveis e a aba **Landing Page** já existente preservada.

## Decisões importantes (alinhadas ao projeto real)

O brief original menciona uma tabela `usuarios` com colunas `role/status/plano/preco_plano/trial_fim`. **Esse esquema não existe no Lavgo.** O projeto já usa o padrão correto (Supabase + RLS + RBAC):

- Identidade: `auth.users` + `public.profiles` (1:1, com `business_name`, `phone`, `onboarding_completed`).
- Papéis: tabela separada `public.user_roles` com enum `app_role` e função `has_role()` SECURITY DEFINER. **Não vamos adicionar `role` em `profiles`** — quebraria a arquitetura de segurança documentada.
- Assinatura: ainda **não existe** integração Stripe ativa, nem tabela de subscriptions. Logo, MRR/ARR/Churn/LTV reais não existem como dado — exibiremos os cards zerados com badge "Aguardando Stripe", em vez de inventar números.

Ações como "alterar plano", "estender trial", "cancelar conta" também dependem de subscriptions reais — implemento somente as que funcionam hoje (reset de senha, bloquear/desbloquear, ver detalhes/uso, impersonar) e marco o restante como "Disponível ao ativar pagamentos".

## 1. Acesso e segurança

**Migração SQL:**
- Garantir o admin: `INSERT INTO user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE email = 'rafael.silva.eh@gmail.com' ON CONFLICT DO NOTHING;`
- `profiles`: adicionar `is_blocked boolean DEFAULT false` e `last_seen_at timestamptz`.
- Nova policy SELECT em `profiles`, `customers`, `cars_in_yard`, `cash_flow_entries`, `services`, `whatsapp_config`, `message_templates`: permitida quando `has_role(auth.uid(),'admin')`. Sem isso o admin não lê dados de outros usuários.
- Função SECURITY DEFINER `admin_list_users()` que retorna `id, email, business_name, phone, created_at, last_seen_at, onboarding_completed, is_blocked, customers_count, cars_count, last_service_at, whatsapp_connected` (evita N+1).
- Função SECURITY DEFINER `admin_metrics()` com agregados globais.

**Frontend:**
- Hook `useIsAdmin()` consulta `user_roles`.
- Em `/admin`: spinner enquanto carrega; se não-admin, `<Navigate to="/" replace />` sem flash de conteúdo.

## 2. Layout

`/admin` continua usando `AppLayout` (sidebar global do app). Sub-navegação em **Tabs** com 5 seções: **Visão Geral · Usuários · WhatsApp · Configurações · Landing Page**. Header da página mostra "Painel Admin" + email do admin logado.

## 3. Visão Geral

Cards (grid responsivo):
- Total de usuários cadastrados (`profiles`)
- Onboarding concluído (% sobre total)
- WhatsApp conectados (`whatsapp_config.is_connected`)
- Carros registrados (todos, `cars_in_yard`)
- Clientes cadastrados (todos, `customers`)
- Notificações enviadas (30d, `notification_status='sent'`)
- **MRR / ARR / Churn / LTV** — `R$0` com badge "Aguardando Stripe". Honesto, não inventa.

Gráficos (recharts):
- **Barras — Novos usuários por mês (últimos 12m)** baseado em `profiles.created_at`. Mês atual em laranja `#f97316`, demais em azul `#0ea5e9`.
- **Linha — Crescimento acumulado de usuários**.
- **Barras — Carros registrados por mês (últimos 12m)** como proxy de uso.

Tabela "Saúde do produto":
```
Métrica                        | Valor | Saudável | Status
Onboarding completion          | X%    | > 60%    | 🟢/🟡/🔴
Usuários com WA conectado      | X%    | > 50%    | 🟢/🟡/🔴
Usuários ativos últimos 7d     | X     | -        | -
Notificações entregues (30d)   | X%    | > 90%    | 🟢/🟡/🔴
```

## 4. Usuários

Tabela com todos os `profiles` via `admin_list_users()`.

Colunas: Estabelecimento · Email · Cadastro · Último acesso · Clientes · Carros · WA · Status · Ações.
Filtros: busca por nome/email + select de status (todos / ativos / bloqueados / sem onboarding).

Menu de ações por linha (`···`):
- **Ver detalhes** — drawer lateral com Estabelecimento, Uso do produto, WhatsApp.
- **Enviar link de redefinição de senha** — edge function `admin-actions` action `reset-password` chama `auth.admin.generateLink({ type:'recovery' })` com service role, retorna o link e copia pro clipboard.
- **Bloquear / Desbloquear** — toggle `profiles.is_blocked`. `AppLayout` passa a checar e expulsa usuário bloqueado.
- **Impersonar** — confirmação dupla, gera magic link via `admin-actions` action `impersonate`, abre em nova aba.
- **Estender trial / Alterar plano / Cancelar conta** — visíveis e desabilitados com tooltip "Disponível ao ativar pagamentos".

## 5. WhatsApp (diagnóstico Evolution API)

Edge function `admin-evolution` (verify_jwt = true, valida `has_role admin`):
- `get-status`: `GET {EVOLUTION_API_URL}` → versão + status + host mascarado.
- `list-instances`: `GET /instance/fetchInstances`, cruzando com `whatsapp_config.instance_id` para mostrar o estabelecimento vinculado.
- `send-test`: pre-flight `connectionState`, envia via `POST /message/sendText/{instanceName}`, retorna **status HTTP + body cru** da Evolution.

UI:
- Painel "Status da API" (verde/vermelho + versão + host).
- Form de teste (instância, número, mensagem) com resposta crua em `<pre>`.
- Tabela "Instâncias ativas" com refresh manual.

## 6. Configurações

Nova tabela `app_settings` (singleton, `id = 1`):
```
plan_monthly_price numeric, plan_semiannual_price numeric, plan_semiannual_discount int,
plan_annual_price numeric, plan_annual_discount int, trial_days int,
msg_completion_default text, msg_reactivation_default text,
updated_at timestamptz, updated_by uuid
```
RLS: SELECT público (preços precisam aparecer na landing), UPDATE somente admin.

UI:
- Form de preços + dias de trial.
- Dois textareas com mensagens padrão (variáveis `{nome} {modelo} {placa}`).
- **Preview ao vivo** ao lado, substituindo por `João / Gol / ABC-1234`.
- Botão "Salvar" → upsert.

Os defaults aqui passam a ser usados como fallback quando o usuário não tiver template próprio em `message_templates`.

## 7. Landing Page (preservada do admin atual)

Mantém a aba existente com os campos: **headline**, **subheadline**, **URL do vídeo** — agora persistidos de verdade. Adiciono em `app_settings` as colunas `landing_headline text`, `landing_subheadline text`, `landing_video_url text`. A página `Landing.tsx` passa a ler esses campos via SELECT público em `app_settings` (com fallback para os textos atuais).

UI da aba: igual à atual (modo visualizar com botão "Editar" → "Salvar"), só que o salvar agora faz upsert em `app_settings` em vez de só `toast.success`.

## Arquivos / mudanças

**Novos:**
- `src/hooks/useIsAdmin.ts`
- `src/pages/admin/AdminOverview.tsx`
- `src/pages/admin/AdminUsers.tsx`
- `src/pages/admin/AdminWhatsApp.tsx`
- `src/pages/admin/AdminSettings.tsx`
- `src/pages/admin/AdminLanding.tsx` (refatoração da aba existente, agora persistente)
- `src/pages/admin/UserDetailsDrawer.tsx`
- `supabase/functions/admin-actions/index.ts`
- `supabase/functions/admin-evolution/index.ts`
- Migration: `is_blocked`, `last_seen_at`, `app_settings` (com campos de landing), funções `admin_list_users()`/`admin_metrics()`, policies admin-SELECT, seed do role admin.

**Editados:**
- `src/pages/Admin.tsx` — vira shell com Tabs (5 abas) e guarda `useIsAdmin`.
- `src/components/AppLayout.tsx` — checagem de `is_blocked` + atualização de `last_seen_at` no login.
- `src/pages/Landing.tsx` — lê textos de `app_settings` com fallback.
- `supabase/config.toml` — registro das duas novas functions.

## O que NÃO entra agora
- MRR/ARR/Churn/LTV reais e ações de plano → dependem de Stripe ativado.

## Verificação final
- [ ] `/admin` redireciona não-admin para `/` em < 1s, sem flash de conteúdo.
- [ ] Apenas `rafael.silva.eh@gmail.com` consegue abrir as 5 abas.
- [ ] Cards de uso refletem contagens reais do banco.
- [ ] Gráfico de novos usuários por mês com mês atual em laranja.
- [ ] Tabela de usuários filtra por status e busca.
- [ ] Reset de senha gera link via Supabase Auth e copia pro clipboard.
- [ ] Bloquear usuário impede login dele no app.
- [ ] Teste de WhatsApp exibe corpo cru da resposta da Evolution.
- [ ] Configurações salvam em `app_settings` e preview ao vivo funciona.
- [ ] Aba Landing Page persiste headline/subheadline/vídeo e a Landing real reflete as alterações.
- [ ] Nenhuma rota fora de `/admin` foi alterada além do hook de bloqueio em `AppLayout` e do read em `Landing.tsx`.
