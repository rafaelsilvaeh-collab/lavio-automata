# Habilitar "Estender trial" + Paywall ao expirar trial

Duas alterações relacionadas, no fluxo de trial dos clientes do Lavgo.

---

## Parte 1 — Habilitar "Estender trial" no submenu admin

Hoje, em `src/pages/admin/AdminUsers.tsx`, o item "Estender trial" no dropdown `···` está fixo como `disabled` dentro do grupo "Aguardando pagamentos". Como o app está em fase de testes, essa ação passa a ficar **sempre habilitada** e funcional.

### Comportamento

Ao clicar em "Estender trial":
1. Abre um `AlertDialog` com input numérico (default `7`, mínimo `1`, máximo `365`) e mostra a data atual de fim de trial do usuário.
2. Confirmar chama o edge function `admin-actions` com a nova ação `extend-trial`.
3. Toast: `"Trial estendido até DD/MM/AAAA."`
4. A linha é atualizada localmente.

Os outros itens ("Alterar plano", "Cancelar conta") continuam desabilitados — não foram pedidos.

---

## Parte 2 — Paywall automático quando o trial expira

Quando o `trial_ends_at` do usuário (não-admin) passa de hoje **e** ele não tem assinatura ativa, ele é bloqueado por um popup global pedindo para assinar um dos planos.

### Onde guardar o estado do trial

A tabela `profiles` ainda não tem coluna de trial. Será adicionada via migration:

- `profiles.trial_ends_at timestamptz` (nullable).
- Backfill: `update profiles set trial_ends_at = created_at + (select trial_days from app_settings where id=1) * interval '1 day' where trial_ends_at is null`.
- `handle_new_user()` passa a setar `trial_ends_at = now() + trial_days * interval '1 day'` para novos cadastros, lendo `app_settings`.
- `admin_list_users()` passa a retornar `trial_ends_at` (UI do admin precisa exibir).

Se assinaturas reais ainda não existem (sem Stripe ativo), basta verificar `trial_ends_at < now()`. Quando Stripe for ativado, o paywall passará a checar também a tabela de subscription. Para já deixar a porta pronta, será adicionada uma coluna `profiles.subscription_status text` (default `null`) que, quando `'active'`, libera o acesso mesmo após o trial. Por enquanto ninguém escreve nela — é apenas o gancho.

### Componente `TrialPaywallGate`

Novo componente envolvido em `AppLayout.tsx`, logo abaixo da checagem de `is_blocked`:

- Lê `profiles` (`trial_ends_at`, `subscription_status`) do usuário logado.
- Lê `user_roles` para identificar admin (admin nunca vê o paywall).
- Lê `app_settings` (preços e descontos) para popular o conteúdo do diálogo.
- Se `subscription_status !== 'active'` **e** `trial_ends_at <= now()`:
  - Renderiza um `Dialog` modal **não dispensável** (`onOpenChange` ignora close, sem botão X) sobre o app.
  - Conteúdo:
    - Título: "Seu período de testes terminou"
    - Subtítulo: "Escolha um plano para continuar usando o Lavgo."
    - 3 cards (Mensal, Semestral, Anual) com preços vindos de `app_settings`, badge de desconto em verde no semestral/anual.
    - Botão "Assinar" em cada card → por enquanto exibe toast `"Pagamentos serão habilitados em breve. Fale com o suporte."` (placeholder até Stripe ser ligado). Quando Stripe entrar, o botão chamará `create-checkout` com o `price_id` correspondente.
    - Link "Sair" no rodapé (`supabase.auth.signOut()`).
- Se ainda dentro do trial, mostra um banner discreto no topo do app: "Seu teste termina em N dias" (apenas quando faltam ≤ 3 dias). Sem bloquear nada.

### Por que isso fica seguro

- A UI bloqueia o uso, mas a segurança real continua na RLS por `user_id`. Como ainda não há subscriptions reais, não faz sentido bloquear leitura/escrita no banco — o usuário expirado simplesmente não consegue navegar.
- Quando Stripe entrar, adicionamos uma policy/condição extra usando `subscription_status` e `trial_ends_at` se desejado.

---

## Backend (Edge Function)

Em `supabase/functions/admin-actions/index.ts`, nova ação `extend-trial`:

- Body: `{ action: "extend-trial", target_user_id, days }`.
- Valida `days` 1–365.
- Calcula: `new_end = max(now(), coalesce(trial_ends_at, now())) + days * interval '1 day'`.
- `update profiles set trial_ends_at = new_end, updated_at = now() where user_id = target`.
- Retorna `{ success: true, trial_ends_at }`.

Verificação de admin via `user_roles` já existe e é reaproveitada.

---

## Arquivos tocados

- `src/pages/admin/AdminUsers.tsx` — habilitar "Estender trial", adicionar dialog com input de dias, exibir `trial_ends_at` na tabela (nova coluna "Trial até"), atualizar interface `AdminUserRow`.
- `src/components/AppLayout.tsx` — montar `<TrialPaywallGate>` envolvendo o conteúdo autenticado.
- `src/components/TrialPaywallGate.tsx` (novo) — lógica de leitura do trial e modal de planos.
- `supabase/functions/admin-actions/index.ts` — ação `extend-trial`.
- Migration:
  - `alter table profiles add column trial_ends_at timestamptz`.
  - `alter table profiles add column subscription_status text`.
  - Backfill de `trial_ends_at` para usuários existentes.
  - Atualizar `handle_new_user()` para preencher `trial_ends_at`.
  - Atualizar `admin_list_users()` para retornar `trial_ends_at` e `subscription_status`.

Sem mudanças em RLS (a função usa service role; o paywall é de UI).

---

## Verificação

- "Estender trial" sempre habilitado e funcional, com diálogo aceitando 1–365 dias.
- Usuário com `trial_ends_at` no passado e sem `subscription_status='active'` vê o popup de planos imediatamente ao abrir o app, sem conseguir fechar a não ser saindo da conta.
- Admin (`rafael.silva.eh@gmail.com`) nunca vê o paywall.
- Estender o trial pelo painel remove o paywall na próxima carga do app do usuário afetado.
- Banner de "trial termina em N dias" aparece somente quando faltam ≤ 3 dias.
- Botões "Assinar" exibem placeholder até Stripe ser ligado — nenhuma cobrança real é feita agora.
- Nenhuma outra rota foi alterada além de `AppLayout` (gate) e `AdminUsers` (ação).
