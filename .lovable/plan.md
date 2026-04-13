

# Substituir seção de vídeo por cards com imagens das telas do app

## O que muda

A seção "Veja o Lavgo em ação" (vídeo placeholder) será substituída por uma galeria de cards mostrando as principais telas do aplicativo.

## Cards planejados

| Card | Título | Descrição |
|------|--------|-----------|
| Dashboard | Painel principal | Visão geral do seu negócio em tempo real |
| Clientes | CRM de clientes | Cadastro completo com histórico de serviços |
| Pátio | Gestão do pátio | Controle de carros em tempo real |
| Caixa do Dia | Controle financeiro | Entradas e saídas do dia organizadas |
| WhatsApp | Mensagens automáticas | Aviso automático quando o carro fica pronto |

## Implementação

1. **Gerar screenshots** das páginas do app (Dashboard, Clientes, Pátio, Caixa, WhatsApp) e salvar em `public/screenshots/`
2. **Substituir a seção de vídeo** (`lines 110-127` em Landing.tsx) por um grid de cards com:
   - Imagem da tela com borda arredondada e sombra
   - Título e descrição curta abaixo da imagem
   - Layout responsivo: 1 coluna mobile, 2 colunas tablet, 3 colunas desktop
3. **Atualizar o link "Ver como funciona"** no hero para rolar até a nova seção (manter o `id="video"` ou renomear para `id="screenshots"`)

## Detalhe técnico

Como não temos screenshots reais disponíveis, usaremos placeholders visuais estilizados (mockups com ícones e cores do app representando cada tela) que podem ser substituídos por imagens reais depois. Cada card terá um fundo gradiente com o ícone da página correspondente simulando a tela.

