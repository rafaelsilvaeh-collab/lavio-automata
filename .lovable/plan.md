

# Plano: Ajustes de UI + Banco de Dados + Preparação Stripe/Z-API

## 1. Ajustes visuais na Landing Page

**Botão "Ver como funciona"**: Trocar de outline branco (ilegível no fundo escuro) para estilo com fundo azul gradient, texto branco — mesmo visual do botão principal mas com variação (ex: borda + fundo semi-transparente azul).

**Planos no mobile**: Mudar o layout dos botões de ciclo de billing de `flex` horizontal para `flex-col` no mobile, listando Mensal → Semestral → Anual verticalmente. No desktop mantém horizontal.

**Badge "Mais vendido"**: Adicionar badge destacado no botão/opção Semestral com texto "Mais vendido" em cor de destaque.

## 2. Criar tabelas no banco de dados

Migração SQL com as seguintes tabelas:

- **profiles** — id (ref auth.users), business_name, phone, created_at
- **customers** — id, user_id, name, phone, car_model, plate, notes, is_recurring, is_active, last_wash_date, created_at
- **services** — id, user_id, name, price, duration_minutes, created_at
- **cars_in_yard** — id, user_id, customer_id (ref customers), service_id (ref services), entry_time, estimated_duration, scheduled_notification_time, status (enum: aguardando/em_lavagem/finalizado/cliente_avisado/entregue), notes, created_at
- **cash_flow_entries** — id, user_id, type (entrada/saida), category, description, amount, entry_date, created_at
- **whatsapp_config** — id, user_id, is_connected, phone_number, api_key, instance_id, created_at
- **message_templates** — id, user_id, template_type (carro_pronto/cliente_inativo), message_text, is_active, created_at
- **user_roles** — id, user_id (ref auth.users), role (enum: admin/user)

Todas com RLS habilitado. Políticas: usuários autenticados acessam apenas seus próprios dados (`user_id = auth.uid()`). Função `has_role` para admin.

Trigger para criar profile automaticamente no signup.

## 3. Habilitar Stripe

Usar a ferramenta `enable_stripe` para ativar a integração. Após ativação, criar os produtos e preços:
- Plano Mensal: R$110/mês
- Plano Semestral: R$96,80/mês (billing a cada 6 meses)
- Plano Anual: R$85,80/mês (billing anual)

Integrar checkout na landing page e gerenciamento de assinatura no dashboard.

## 4. Preparação Z-API

Criar a estrutura para integração Z-API:
- Tabela `whatsapp_config` (já incluída acima) para armazenar credenciais
- Edge function para proxy de chamadas Z-API (gerar QR code, enviar mensagem, verificar status)
- Secret `ZAPI_TOKEN` será solicitada ao usuário quando for configurar
- Interface já existe — será conectada às edge functions

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/Landing.tsx` | Cor do botão, layout mobile dos planos, badge "Mais vendido" |
| Migration SQL | Criar todas as tabelas, enums, RLS, triggers |
| Stripe integration | Habilitar e configurar produtos |
| Edge function (whatsapp) | Proxy para Z-API |

