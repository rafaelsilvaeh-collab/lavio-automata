

# Substituir cards por screenshots reais

## O que muda

Substituir os 5 cards placeholder na seção "Veja o Lavgo em ação" pelos 4 screenshots reais enviados, removendo o card "WhatsApp" (excedente).

## Passos

1. **Copiar as 4 imagens** enviadas para `public/screenshots/`, substituindo os placeholders:
   - `IMG_1218.jpeg` → `public/screenshots/dashboard.jpg` (Dashboard)
   - `IMG_1220.jpeg` → `public/screenshots/clientes.jpg` (Clientes)
   - `IMG_1221.jpeg` → `public/screenshots/patio.jpg` (Pátio)
   - `IMG_1222.jpeg` → `public/screenshots/caixa.jpg` (Caixa do Dia)

2. **Remover `public/screenshots/whatsapp.jpg`** (sem screenshot correspondente)

3. **Atualizar `src/pages/Landing.tsx`**: remover o item WhatsApp do array de screenshots, mantendo apenas os 4 cards. Ajustar o grid para `lg:grid-cols-2` (2x2) já que agora são 4 cards.

