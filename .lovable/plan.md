# Plano: correção dos findings de segurança + reset de WhatsApp no admin

## 1. Proteger a edge function `send-scheduled-notifications` (finding `unauth_scheduled_notif`)
- O código da função já foi ajustado para exigir o cabeçalho `x-cron-secret` comparado à env `CRON_SECRET`.
- Rotação do `CRON_SECRET`: deletar o valor atual, gerar um novo e armazená-lo via `set_secret`.
- Atualizar o job `pg_cron` existente (`send-scheduled-notifications-every-minute`) para enviar `x-cron-secret` com o mesmo valor.

> **Atenção:** entre a deleção e a recriação do secret pode haver até 1 execução do cron retornando 401 — sem impacto funcional (a próxima execução reprocessa as notificações pendentes).

## 2. Validar paywall no servidor via RLS (finding `paywall_client_side`)
- Criar função `public.is_subscription_active(uid)` retornando `true` quando `trial_ends_at > now()` ou `subscription_status = 'active'`, ou quando o usuário tem role `admin`.
- Adicionar essa verificação como política RLS **restrictiva** nas tabelas multi-tenant: `customers`, `cars_in_yard`, `cash_flow_entries`, `services`, `message_templates`, `whatsapp_config`. Mantém as policies atuais por `auth.uid()` e soma a restrição de assinatura ativa.
- Admins continuam com acesso por já passarem na função.

> **Risco**: usuários com trial expirado perdem leitura/escrita de dados (comportamento desejado do paywall). A usuária beta `fernanda.andradi@gmail.com` continua liberada porque o trial dela está estendido até 2026-07-24.

## 3. Adicionar reset de WhatsApp por usuário no Admin
- Em `src/pages/admin/AdminUsers.tsx`, no menu de ações (`···`) de cada usuário, adicionar o item **"Resetar conexão WhatsApp"**.
- Ação chama `admin-actions` com `action: "reset-whatsapp-instance"` e `target_user_id` do usuário selecionado (a edge function já existe e trata o caso de instância inexistente na Evolution).
- Confirmação simples antes de executar; toast com o resultado.

## 4. Marcar findings como corrigidos
- Usar `manage_security_finding` para `unauth_scheduled_notif` e `paywall_client_side` após aplicar as mudanças.
