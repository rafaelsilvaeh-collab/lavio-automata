

# Corrigir bugs do fluxo de registro

## Bug 1 — Horário do aviso WhatsApp não persiste
**Causa**: a string `${today}T${notifyTime}:00` é enviada sem timezone para uma coluna `timestamptz`. Conforme o ambiente do Postgres/Supabase, isso pode ser interpretado como UTC, resultando em valor inconsistente ou nulo dependendo de validação de timezone.

**Fix em `src/components/RegisterCarDialog.tsx`** (linha 318): construir um `Date` local (que respeita o fuso do navegador) e enviar `.toISOString()`:

```ts
let scheduled: string | null = null;
if (notifyTime) {
  const [hh, mm] = notifyTime.split(":").map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  scheduled = d.toISOString();
}
// ... payload:
scheduled_notification_time: scheduled,
```

Isso garante que o horário escolhido pelo usuário no fuso local seja convertido corretamente para UTC antes de salvar — e ao reler com `new Date(iso).toLocaleTimeString("pt-BR", ...)` no Pátio, voltará no fuso local correto.

## Bug 2 — Banner amarelo "configure serviços" persiste após cadastro inline
**Causa**: em `src/pages/Yard.tsx`, o `onSuccess` do `RegisterCarDialog` chama apenas `fetchCars`. Quando o usuário cadastra um novo serviço dentro do modal (via "Salvar no catálogo"), a lista local `services` do Yard não é atualizada, e a flag `noServices` continua `true`.

**Fix em `src/pages/Yard.tsx`**: alterar o `onSuccess` para recarregar ambos:

```tsx
<RegisterCarDialog
  ...
  onSuccess={() => { fetchCars(); fetchServices(); }}
/>
```

E o mesmo para `FinalizeCarDialog` por consistência (caso futuro o finalize precise atualizar serviços).

## Arquivos alterados
- `src/components/RegisterCarDialog.tsx` — construção do timestamp local na função `handleRegister`.
- `src/pages/Yard.tsx` — `onSuccess` do dialog também chama `fetchServices()`.

## Verificação
- Registrar carro com aviso `14:30` → reabrir card no Pátio → exibe `14:30` (não `--:--`).
- Sem serviços cadastrados, registrar carro com serviço novo "Salvar no catálogo" marcado → banner amarelo desaparece imediatamente após salvar.

