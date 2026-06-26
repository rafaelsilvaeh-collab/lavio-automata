# Corrigir conexão WhatsApp: causa real + reset de instância

## Diagnóstico

O toast `"Edge Function returned a non-2xx status code"` que a Fernanda viu é genérico do cliente Supabase. O frontend (`src/pages/WhatsApp.tsx → invokeWhatsApp`) descarta o corpo da resposta sempre que vem `error`, então a mensagem real produzida pela edge function (`{ error, code, ... }`) nunca chega à tela.

Sem os logs da tentativa dela (não há invocações recentes da função `whatsapp` registradas), o motivo exato é desconhecido. A causa mais comum desse sintoma é **instância órfã/travada na Evolution API** — quando uma instância foi criada antes mas ficou em estado inconsistente, novas tentativas de `create-instance` ou `get-qrcode` falham silenciosamente.

## Mudanças

### 1. `src/pages/WhatsApp.tsx` — expor o erro real

Reescrever `invokeWhatsApp` para, quando `error` for um `FunctionsHttpError`, ler o corpo via `await error.context.response.clone().json()` e usar `body.error` na mensagem lançada (anexar `code` e `state` ao Error). Logar o objeto completo no console para suporte.

Em `handleConnect` / `handleCheckStatus`, mapear códigos conhecidos para textos amigáveis em português (`WA_NOT_CONFIGURED`, `WA_DISCONNECTED`, `401`, etc.); demais casos exibem `error.message` real.

### 2. `supabase/functions/whatsapp/index.ts` — nova ação `reset-instance` + fallback automático

**Nova action `reset-instance`:** chama `DELETE /instance/delete/{instance}` na Evolution API, ignora 404, apaga o registro em `whatsapp_config` do usuário autenticado e retorna `{ ok: true }`. Protegida por RLS via `auth.uid()` (cada usuário só reseta a própria instância).

**Auto-reset no `create-instance`:** quando a Evolution responde não-OK e o corpo **não** contém "already" (situação atual que gera erro genérico), antes de desistir, tentar uma vez: `DELETE` da instância + recriar. Se a recriação funcionar, segue normal; se falhar de novo, retorna erro estruturado com `status` da Evolution e trecho do body (`{ error: "Falha ao criar instância (Evolution status N): <trecho>", code: "WA_CREATE_FAILED" }`, HTTP 200 com `fallback: true` para o cliente poder reagir sem crash).

**Padronização de erros:** todas as respostas de erro passam a usar HTTP 200 com `{ error, code, fallback }` quando o erro vier do provedor externo (Evolution 4xx/5xx), preservando 401 só para auth de fato. Isso garante que `supabase.functions.invoke()` entregue `data` populado em vez de só um `FunctionsHttpError` opaco — combinando com a melhoria do item 1, o usuário sempre vê a causa.

Logs adicionais (`console.error` com `status` + 300 chars do body) em `create-instance` e `get-qrcode` para diagnosticar via edge function logs caso volte a falhar.

### 3. `src/pages/WhatsApp.tsx` — botão "Resetar conexão"

Botão secundário visível quando há instância configurada mas desconectada (ou após erro de conexão). Chama `invokeWhatsApp("reset-instance")`, mostra toast de sucesso e dispara `handleConnect()` automaticamente para gerar QR novo. Sem confirmação extra — a ação é segura (a usuária só pode resetar a própria instância e o efeito é apenas obrigar um novo QR).

### 4. `src/pages/admin/AdminWhatsApp.tsx` — reset por usuário (admin)

Na seção de diagnóstico WhatsApp do painel admin, adicionar ação "Resetar instância" ao lado de cada usuário listado. Usa a edge function `admin-actions` (já existente) com nova ação `reset-whatsapp-instance`, que chama o mesmo fluxo de `DELETE` na Evolution + limpeza do `whatsapp_config` do usuário-alvo. Protegida por `has_role(auth.uid(),'admin')`. Permite resolver o caso da Fernanda **agora**, sem esperar ela tentar de novo.

## Verificação

- Reset manual da Fernanda via painel admin → próxima tentativa de conexão dela gera QR limpo.
- Erros futuros aparecem no toast com causa real (ex.: "Falha ao criar instância (Evolution status 403)").
- Caso a Evolution esteja instável, o auto-reset interno já recupera no primeiro clique do "Conectar".
- Logs da edge function `whatsapp` passam a registrar status HTTP e trecho do body em qualquer falha.

## O que NÃO muda

Schema do banco, RLS, secrets, fluxo de templates, envio de mensagens, agendamento, paywall, trial. A mudança é cirúrgica na função `whatsapp`, na função `admin-actions` (nova subação), na página `WhatsApp.tsx` e na aba WhatsApp do admin.
