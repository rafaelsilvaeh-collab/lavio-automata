Plano revisado com priorização:

## 1. Correção prioritária: WhatsApp — erro "Application not found" (Evolution status 404)

O usuário está vendo o erro ao tentar conectar/reconectar o WhatsApp: após resetar a instância, a função `create-instance` retorna `404 Application not found`.

### Arquivos afetados
- `supabase/functions/whatsapp/index.ts` (ação `create-instance` e endpoints usados)
- `supabase/functions/admin-actions/index.ts` (reset de instância via admin)
- `src/pages/WhatsApp.tsx` (mensagens de erro e fluxo de reconexão, se necessário)

### O que será feito
- Verificar logs da edge function `whatsapp` para confirmar a URL exata que retorna 404.
- Validar se os endpoints do Evolution API v1.8.x estão corretos (`/instance/create`, headers `apikey`, body `integration: "WHATSAPP-BAILEYS"`).
- Corrigir endpoint, path, headers ou payload conforme a versão real do Evolution API configurado no projeto.
- Adicionar tratamento específico para o erro "Application not found" (mensagem amigável no frontend e/ou tentativa fallback configurável).
- Testar o fluxo completo: reset → create-instance → get-qrcode → check-status.
- Se necessário, alinhar `admin-actions` para usar a mesma lógica de criação/reset.

## 2. Reorganizar card do plano anual na Landing page

### Arquivo afetado
- `src/pages/Landing.tsx`

### O que será feito
- No card do plano Anual, colocar **R$ 74,17 /mês** como destaque principal.
- Abaixo do destaque, exibir o texto de apoio: **Faturado anualmente (R$ 890,00/ano)**.
- Manter a tag de benefício: **Economize 2 meses de assinatura** (ou **Economize cerca de 17%**).
- Deixar o plano Mensal inalterado.
- Ajustar a hierarquia visual para reduzir a percepção de custo alto do pagamento anual.

---

A correção do WhatsApp será feita primeiro, pois bloqueia uma função core do app. A alteração nos preços da landing page virá em seguida.