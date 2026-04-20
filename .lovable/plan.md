

# Plano: Fluxo único de registro com foto/observações + finalização + exclusões + modo treino + diagnóstico WhatsApp + zerar dados

## Confirmações do usuário
- Apagar dados de **todos os usuários** (todos eram testes).
- Adicionar **foto do veículo** e **observações** na Etapa 1 do registro.
- Observações aparece apenas quando foto não é enviada.
- Dados isolados por estabelecimento (`user_id`) via RLS já existente.

## 1. Migrations

### Schema
```sql
-- modo treino
alter table cash_flow_entries add column is_test boolean not null default false;

-- foto e observações no registro
alter table cars_in_yard add column photo_url text;
alter table cars_in_yard add column entry_notes text;
alter table cars_in_yard add column final_price numeric;
alter table cars_in_yard add column ad_hoc_service_name text;
```
- `final_price` e `ad_hoc_service_name` evitam codificar preço dentro de `notes` (mais limpo). Usados quando o serviço é "ad-hoc" (sem catálogo) ou quando o usuário edita o preço.

### Storage bucket para fotos
```sql
insert into storage.buckets (id, name, public) values ('vehicle-photos', 'vehicle-photos', false);

-- RLS: cada usuário só vê/escreve em sua própria pasta {user_id}/...
create policy "users upload own vehicle photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'vehicle-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users read own vehicle photos"
on storage.objects for select to authenticated
using (bucket_id = 'vehicle-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own vehicle photos"
on storage.objects for delete to authenticated
using (bucket_id = 'vehicle-photos' and (storage.foldername(name))[1] = auth.uid()::text);
```
- Bucket privado. Caminho: `{user_id}/{car_id_or_uuid}.jpg`. Acesso via signed URL na exibição.

### Zerar dados (todos os usuários)
Ação separada (não migration de schema) — `delete` em ordem segura:
```sql
delete from cars_in_yard;
delete from cash_flow_entries;
delete from services;
delete from customers;
```
`profiles`, `user_roles`, `whatsapp_config`, `message_templates` preservados.

## 2. `RegisterCarDialog.tsx` — reescrita em 3 etapas

**Etapa 1 — Cliente + foto/observações**
- Busca com debounce 300ms em `customers` (nome/placa) → dropdown.
- `+ Cadastrar novo cliente` expande inline (nome, WhatsApp `(DD) 9XXXX-XXXX`, placa, modelo). Salva com `toStorage(phone)` e avança.
- **Após selecionar cliente**:
  - Campo "📸 Foto do veículo na entrada" (input file `accept="image/*" capture="environment"`). Preview da imagem.
  - Se nenhuma foto enviada → exibe textarea "📝 Observações sobre o veículo (riscos, amassados, condição)" obrigatório.
  - Se foto enviada → textarea fica oculta (foto substitui necessidade textual).

**Etapa 2 — Tempo e aviso**
- Tempo estimado (min, default 40), horário do aviso (time).

**Etapa 3 — Serviço e preço**
- Busca em `services` → dropdown. Selecionar preenche nome/preço.
- `+ Cadastrar novo serviço`: nome, preço, checkbox "Salvar no catálogo".
  - Marcado → `insert` em `services`, vincula `service_id`.
  - Desmarcado → ad-hoc: `service_id=null`, salva `ad_hoc_service_name` e `final_price`.
- Preço sempre editável (sobrescreve `final_price`).
- Submit: upload da foto (se houver) para `vehicle-photos/{user_id}/{uuid}.jpg`, depois `insert` em `cars_in_yard` com `status='aguardando'`, `photo_url`, `entry_notes`, `final_price`, `ad_hoc_service_name`. **Não cria entrada no caixa.**

**Modo edição** (props `editId`): pré-carrega registro, permite trocar foto/observações/etapas e faz `update`.

## 3. `FinalizeCarDialog.tsx` (novo)

Acionado ao clicar "✅ Carro pronto" no Pátio:
- Serviço (read-only) — de `services.name` ou `ad_hoc_service_name`.
- Valor R$ editável (pré: `final_price` ou `services.price`).
- Forma de pagamento: PIX / Dinheiro / Cartão (botões).
- "Finalizar e lançar no caixa":
  - `insert` em `cash_flow_entries` (type=entrada, category=nome do serviço, description=`{serviço} — {cliente} ({placa}) ({pagamento})`, amount, entry_date=hoje, `is_test = localStorage.modoTreino === 'true'`).
  - `update cars_in_yard set status='entregue'`.

## 4. `Yard.tsx`

- Botão 🗑️ por card → `AlertDialog` "Excluir este registro?" → `delete cars_in_yard` (não toca caixa). Também apaga foto do storage.
- Botão ✏️ em cards `aguardando`/`lavando` → reabre `RegisterCarDialog` em modo edição.
- Mostrar miniatura da foto (signed URL) se existir; clique abre preview maior.
- Mantém banner amarelo de "configure serviços" e os 3 estados visuais já feitos.
- Substituir o avanço direto de "em_lavagem → cliente_avisado" por abertura do `FinalizeCarDialog`.

## 5. `Customers.tsx`

- Botão 🗑️ no card:
  - Verifica histórico: `select count from cash_flow_entries where description ilike '%{nome}%' and user_id=...`. Se >0: bloqueia com toast "Cliente possui histórico e não pode ser excluído."
  - Senão: `delete from cars_in_yard where customer_id=...` + `delete from customers`.
- Botão ✏️: reabre o form com dados (`fromStorage(phone)`) → `update`.

## 6. `CashFlow.tsx` — Modo treino

- Toggle 🎓 "Modo treino" no topo (persistido em `localStorage`).
- Lançamentos com `is_test=true` exibidos em cinza com badge "TESTE".
- Botão "🗑️ Limpar registros de teste" → `AlertDialog` → `delete where is_test=true and user_id=...`.
- Totais (entradas/saídas/resultado) excluem `is_test=true`.

## 7. `Dashboard.tsx`

- Ao agregar faturamento/contadores: filtrar `is_test=true` em `cash_flow_entries`.

## 8. `supabase/functions/whatsapp/index.ts` — diagnóstico embarcado

- Adicionar logs estruturados em todas as actions: `[WA] action={x} URL={url} STATE={state} NUMBER={masked} STATUS={http}`.
- No `send-message`: antes de enviar, `GET /instance/connectionState/{instanceName}`.
  - `state !== 'open'` → retornar `{error, code:'WA_DISCONNECTED'}` HTTP 409.
  - `EVOLUTION_API_URL` vazia → `{error, code:'WA_NOT_CONFIGURED'}` HTTP 503.
- Garantir número no formato `55DDXXXXXXXXX`.
- Frontend: tratar 409/503 com toast amigável ("WhatsApp desconectado. Reconecte em Configurações.").

> Não executo o disparo real (envolve mensagem a cliente do usuário). O usuário roda um registro real e os logs aparecem em Edge Function Logs para inspeção.

## 9. Verificação final

- Modal único 3 etapas com foto + observações condicional.
- Foto privada por estabelecimento (RLS em storage).
- Campos `photo_url`, `entry_notes`, `final_price`, `ad_hoc_service_name` em `cars_in_yard`.
- Caixa só recebe entrada na finalização, com forma de pagamento.
- Exclusões com guardas; modo treino isolado.
- Edição de carros e clientes.
- WhatsApp com diagnóstico e mensagens de erro claras.
- Dados zerados (todos usuários).
- RLS já garante isolamento por `user_id` em todas as tabelas.

## Arquivos
- **Migrations**: schema (colunas + bucket + policies de storage).
- **Operação de dados**: deletes em `cars_in_yard`, `cash_flow_entries`, `services`, `customers`.
- **Novo**: `src/components/FinalizeCarDialog.tsx`.
- **Reescrito**: `src/components/RegisterCarDialog.tsx`.
- **Editados**: `src/pages/Yard.tsx`, `src/pages/Customers.tsx`, `src/pages/CashFlow.tsx`, `src/pages/Dashboard.tsx`, `supabase/functions/whatsapp/index.ts`.

