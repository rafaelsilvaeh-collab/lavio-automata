
# Integrar Links de Pagamento Stripe na Landing Page

## O que será feito
Conectar os botões "Começar 7 dias grátis" da seção de preços aos links de pagamento Stripe correspondentes, de acordo com o plano selecionado.

## Links de Pagamento
| Plano | Link |
|---|---|
| Mensal | `https://buy.stripe.com/cNi7sLfz20Q5fw22P12Ry09` |
| Semestral | `https://buy.stripe.com/6oU6oHbiM7et0B8gFR2Ry0a` |
| Anual | `https://buy.stripe.com/dRm3cv3QkfKZ3Nk0GT2Ry0b` |

## Alterações

**`src/pages/Landing.tsx`**:
- Adicionar mapeamento de links Stripe por ciclo de billing no objeto `prices`
- Alterar o botão "Começar 7 dias grátis" na seção de preços para abrir o link Stripe correspondente ao plano selecionado (abre em nova aba)
- Manter os CTAs do hero e header apontando para `/auth?tab=signup` (cadastro no sistema)
