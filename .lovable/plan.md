

# Alterações na Landing Page

## 1. Botão flutuante WhatsApp
- Remover email `suporte@lavgo.app` do footer
- Adicionar botão flutuante fixo (bottom-right) verde com ícone WhatsApp
- Link: `https://wa.me/5515991473815?text=Olá! Preciso de ajuda com o Lavgo`

## 2. Atualizar links Stripe
| Plano | Link |
|-------|------|
| Mensal | `https://buy.stripe.com/7sY6oHdqU7etabIdtF2Ry0c` |
| Semestral | `https://buy.stripe.com/00w14ncmQ7etdnU2P12Ry0d` |
| Anual | `https://buy.stripe.com/eVqdR9dqUgP3erYaht2Ry0e` |

## 3. Grid de preços: 3 colunas em tablet e desktop
- `grid-cols-1` para mobile (< 768px)
- `md:grid-cols-3` para tablet e desktop (>= 768px)
- Mantém badge "Mais popular" no plano Semestral

## Arquivo alterado
- `src/pages/Landing.tsx`

