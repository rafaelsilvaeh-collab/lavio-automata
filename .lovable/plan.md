

# Plano: Onboarding guiado, ações principais e simplificação de UX

## 1. Migration — flag de onboarding
- Adicionar coluna `onboarding_completed boolean not null default false` em `profiles`.
- Não criar tabela nova; reaproveitar `profiles` (já tem 1 linha por user via trigger `handle_new_user`).

## 2. Novo componente `src/components/OnboardingModal.tsx`
- Modal `Dialog` fullscreen (overlay escuro, `onPointerDownOutside={e=>e.preventDefault()}`, sem botão X).
- Estado interno `step: 1|2|3`. Indicador "Passo X de 3" no topo.
- **Passo 1 — Serviços** 🛠️
  - 4 cards selecionáveis (toggle): Simples R$80, Completa R$100, Polimento R$150, Higienização R$200.
  - Cada card permite editar preço inline (input pequeno).
  - Botão "+ Adicionar outro serviço" expande mini-form (nome+preço).
  - Continuar → `insert` em `services` (apenas selecionados) com `user_id`. Pular → avança sem inserir.
- **Passo 2 — Primeiro cliente** 👤
  - Campos: nome (req), WhatsApp (req, máscara `55 (DD) 9XXXX-XXXX`), placa (req, máscara `ABC-1D23`), modelo (opcional).
  - Continuar → `insert` em `customers`. Pular → avança.
- **Passo 3 — WhatsApp** 💬
  - Reaproveita lógica de `WhatsApp.tsx`: chama edge function `whatsapp` com `create-instance` + `get-qrcode`. Polling `check-status` a cada 5s.
  - Botão "Começar a usar o Lavgo ✅" habilitado apenas após `connected=true`. Link "Conectar depois" sempre visível.
- Ao finalizar/pular qualquer passo após o 3: `update profiles set onboarding_completed=true where user_id=...` e fechar.

## 3. Disparo do onboarding
- Em `src/components/AppLayout.tsx`: `useEffect` busca `profiles.onboarding_completed`. Se `false`, monta `<OnboardingModal />`. Não checar tabelas vazias (a flag já é a fonte de verdade — mais robusto contra usuários que apagam dados).
- Para usuários existentes, considera-se `onboarding_completed=false` como default da migration; se quiser pular, eles clicam "Pular".

## 4. Botão principal na Home (`src/pages/Dashboard.tsx`)
- Logo abaixo da grid de stats e antes de "Carros no pátio":
  - `<Button>` full-width, `h-16`, `bg-[#0ea5e9] hover:bg-[#0284c7]`, `rounded-2xl`, `shadow-[0_4px_14px_rgba(14,165,233,0.4)]`, texto branco bold 18px: "🚗 + Registrar novo carro" + sublinha "Toque aqui para iniciar".
- Onclick: abre o **mesmo modal** já existente. Opções:
  - **Solução**: extrair o `<Dialog>` de `Yard.tsx` para um componente reutilizável `RegisterCarDialog` controlado por props `open/onOpenChange`. Importado tanto em `Yard.tsx` quanto em `Dashboard.tsx`. Após sucesso, refazer fetch local.

## 5. Indicador de WhatsApp na Home
- Em `Dashboard.tsx`: chamar edge function `whatsapp` action `check-status` ao montar.
- Render acima do botão principal:
  - Conectado: `bg-[#f0fdf4] text-[#15803d]` "💬 WhatsApp ativo — mensagens automáticas".
  - Desconectado: `bg-[#fef9c3] text-[#854d0e]` com link `→ /whatsapp` "Conectar agora".

## 6. Banner contextual no Pátio (`src/pages/Yard.tsx`)
- Se `services.length === 0`: banner amarelo no topo `bg-[#fef9c3] border-l-4 border-[#eab308] text-[#854d0e] rounded-lg p-3`, com texto e link `→ /services`.
- Some automaticamente quando o array tem >=1 item (já refletido em `services` state).

## 7. Simplificar estados do Pátio
- Manter o enum `car_status` no DB (não migrar) para não quebrar nada. Apenas reagrupar visualmente:
  - `aguardando` → 🟡 "Chegou" (`#f59e0b`)
  - `em_lavagem` → 🔵 "Lavando" (`#3b82f6`)
  - `finalizado` + `cliente_avisado` → ✅ "Pronto pra retirar" (`#22c55e`)
  - `entregue` permanece oculto (já é `.neq("entregue")`).
- Botões de progressão:
  - De `aguardando`: "▶ Iniciou lavagem" → seta para `em_lavagem`.
  - De `em_lavagem`: "✅ Carro pronto" → seta para `cliente_avisado` (pula `finalizado` para fluxo simples).
  - De `cliente_avisado`: botão "Entregar e finalizar" → seta para `entregue` (sai do pátio). Sem ação de "registrar pagamento" extra — pagamento já é lançado no caixa no registro.
- Atualizar `statusConfig` e `statusOrder` accordingly. Indicador de progresso vira 3 bolinhas.

## 8. Verificação final
- Onboarding aparece para `profiles.onboarding_completed=false` e some após.
- Botão "Registrar novo carro" visível na Home sem rolar (no viewport mobile médio).
- Mesmo dialog reutilizado em Home e Pátio.
- Banner amarelo aparece no Pátio quando sem serviços; some ao cadastrar.
- 3 estados visuais no Pátio com cores e textos novos.
- Indicador WhatsApp na Home reflete `check-status`.
- Landing page (`Landing.tsx`) intocada.

## Arquivos
- **Migration**: `ALTER TABLE profiles ADD COLUMN onboarding_completed boolean not null default false;`
- **Novo**: `src/components/OnboardingModal.tsx`, `src/components/RegisterCarDialog.tsx`
- **Editados**: `src/components/AppLayout.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Yard.tsx`

