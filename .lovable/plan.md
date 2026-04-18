

# Otimização de Conversão e Cores da Landing Page (revisado)

## Contexto
Apenas `src/pages/Landing.tsx` e `src/index.css` serão alterados. Painel do app intocado.

## Alterações

### 1. `src/index.css` — tokens de cor
- Adicionar variáveis no `:root`:
  - `--cta-orange: 24 95% 53%` (#f97316)
  - `--cta-orange-hover: 20 90% 48%` (#ea580c)
  - `--brand-blue-dark: 224 76% 33%` (#1e40af)
  - `--brand-blue-darker: 224 64% 27%` (#1e3a8a)
  - `--brand-blue-accent: 224 76% 40%` (#1d4ed8)

### 2. `src/pages/Landing.tsx`

**Hero (mobile-first, cabe em 375px sem rolar)**
- Reduzir padding mobile: `pt-24 pb-10 md:pt-40 md:pb-32`
- Remover badge superior
- Headline: "Seu cliente fica ligando perguntando se o carro tá pronto?"
- Subheadline única: "O Lavgo avisa automaticamente pelo WhatsApp. Sem você digitar nada."
- Remover segundo parágrafo e o botão "Ver como funciona"
- CTA único full-width laranja `#f97316`: "Testar grátis por 7 dias"
- Micro-copy: "Sem cartão de crédito. Cancele quando quiser."

**Nova seção: Prova Social (entre hero e vídeo)**
- Fundo branco, borda `#e2e8f0`, padding 16px
- Constantes no topo: `SOCIAL_PROOF = { customers: '+50', rating: '4.9/5' }`
- Linha 1: `🚗 +50 lava-rápidos | ⭐ 4.9/5 avaliação | 💬 WhatsApp nativo` (números em `#1d4ed8` extrabold)
- Linha 2: card de depoimento centralizado:
  - "Antes eu ficava respondendo WhatsApp o dia todo. Agora o sistema avisa e eu foco na lavagem."
  - "— Primeiro usuário do Lavgo"

**Stats cards (+40%, 3x, 60%)**
- Trocar `text-gradient` por `text-[#1d4ed8] font-extrabold`

**Pricing — âncora de valor**
- Abaixo de "Comece com 7 dias grátis. Cancele quando quiser." adicionar:
  - "R$149/mês é menos do que o valor de 2 lavagens completas perdidas por semana por falta de comunicação."
  - Estilo: `text-sm text-[#64748b] text-center mb-6 max-w-xl mx-auto`

**Pricing — botões filled**
- Mensal e Anual (não selecionados): `bg-[#1e40af] hover:bg-[#1e3a8a] text-white`
- Semestral (popular): mantém gradient atual

**Novo CTA final (antes do footer)**
- Headline: "Comece hoje. Seus clientes agradecem amanhã."
- Subheadline: "7 dias grátis. Sem burocracia. Cancele quando quiser."
- Botão laranja `#f97316`: "Criar minha conta grátis →"

**Botão WhatsApp flutuante**
- Atualizar número de `5515991473815` para `5515991364980`
- Link: `https://wa.me/5515991364980?text=Olá! Vi o Lavgo e tenho interesse em testar`

## Arquivos alterados
- `src/index.css` — tokens de cor
- `src/pages/Landing.tsx` — hero, prova social, stats, pricing, CTA final, WhatsApp number

