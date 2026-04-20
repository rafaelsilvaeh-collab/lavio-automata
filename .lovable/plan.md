

# Alterar formato do telefone: começar pelo DDD (sem código do país)

## Contexto
Hoje o input de WhatsApp pede `55 (DD) 9XXXX-XXXX` — começando pelo código do país. O usuário quer entrar apenas com `(DD) 9XXXX-XXXX`, e o `55` é adicionado automaticamente nos bastidores antes de salvar/enviar.

## Alteração de comportamento
- **Display/input**: usuário digita só `(15) 99136-4980` (11 dígitos: DDD + número).
- **Armazenamento**: continua salvo com `55` na frente (`5515991364980`) para compatibilidade com Evolution API e dados existentes.
- **Edição de cliente já existente**: ao carregar telefone que começa com `55`, exibir sem o `55` (mostrar só DDD + número).

## Arquivos a alterar

### 1. `src/components/OnboardingModal.tsx`
- Substituir `formatPhoneBR` por máscara `(DD) 9XXXX-XXXX` (10–11 dígitos).
- No insert do cliente, prefixar `55` antes de salvar:
  ```ts
  phone: "55" + custPhone.replace(/\D/g, "")
  ```
- Placeholder vira `(15) 99999-9999`.

### 2. `src/components/RegisterCarDialog.tsx`
- Localizar máscara/placeholder do telefone no formulário "novo cliente" e aplicar mesma regra (entrada sem `55`, salvar com `55`).

### 3. `src/pages/Customers.tsx`
- Form de cadastro/edição de cliente:
  - Máscara nova `(DD) 9XXXX-XXXX`.
  - Ao **carregar** cliente para editar: se `phone` começa com `55` e tem 13 dígitos, remover os 2 primeiros para exibição.
  - Ao **salvar**: re-adicionar `55` antes do insert/update.
- Atualizar placeholder e textos auxiliares se houver.

### 4. Helper compartilhado (opcional mas recomendado) — `src/lib/phone.ts`
- Criar 3 utilitários e usar nos 3 arquivos para evitar duplicação:
  - `formatPhoneInput(raw: string): string` → aplica máscara `(DD) 9XXXX-XXXX`.
  - `toStorage(displayPhone: string): string` → retorna `55` + dígitos.
  - `fromStorage(stored: string): string` → remove `55` inicial se presente e devolve formatado.

## Não alterar
- Edge function `whatsapp` e exibições no painel (lista de clientes, mensagens) — continuam usando o número completo armazenado.
- Banco de dados — formato de armazenamento permanece `5515XXXXXXXXX`.
- Landing page e botão flutuante de WhatsApp.

## Verificação
- Onboarding aceita `(15) 99136-4980` e salva `5515991364980`.
- Cadastro de cliente no `RegisterCarDialog` segue mesma regra.
- Edição em `Customers.tsx` pré-preenche sem o `55` e salva com `55` de volta.
- Clientes antigos continuam funcionando (envio de WhatsApp preserva número completo).

