

# Ajustes na Navegação, Serviços e Pátio

## Contexto
A tabela `services` já existe e funciona. A página Services.tsx já tem CRUD. O Yard.tsx já integra com caixa. Precisa: reorganizar nav, adicionar atalhos rápidos + descrição nos serviços, tornar preço read-only no pátio, adicionar forma de pagamento, e mover WhatsApp para menu secundário.

A tabela `services` não tem coluna `description` -- será necessária uma migração para adicioná-la.

Não será criada `servicos_catalogo` -- a tabela `services` já cumpre o papel com RLS por `user_id`.

## Alterações

### 1. Migração: adicionar `description` à tabela `services`
```sql
ALTER TABLE services ADD COLUMN description text;
```

### 2. BottomNav -- reordenar, remover WhatsApp
Ordem fixa: Home | Clientes | Pátio | Serviços | Caixa

### 3. AppLayout -- header mobile com menu ···
Adicionar header no mobile com "Lavgo" à esquerda e `MoreVertical` à direita. Menu dropdown com:
- Conectar WhatsApp (navega para `/whatsapp`)
- Configurações (placeholder)
- Sair (`signOut()`)

### 4. AppSidebar -- mover WhatsApp para seção "Mais"
Remover WhatsApp de `mainItems`, colocar em seção secundária junto com Admin.

### 5. Services.tsx -- atalhos rápidos + campo descrição
- No empty state, exibir 4 botões de atalho:
  - Simples R$80, Completa R$100, Polimento R$150, Higienização R$200
- Clicar num atalho abre o dialog com nome e preço pré-preenchidos
- Adicionar campo "Descrição (opcional)" ao formulário
- Incluir `description` no payload de insert/update

### 6. Yard.tsx -- preço read-only + forma de pagamento
- Ao selecionar serviço, exibir campo "Preço (R$)" read-only com valor do catálogo
- Adicionar "Forma de pagamento": PIX | Dinheiro | Cartão (botões toggle visuais)
- No `handleRegister`, incluir forma de pagamento na descrição do lançamento no caixa
- Toast: "Carro registrado e lançado no caixa ✅"

## Arquivos alterados
- **Migração**: `ALTER TABLE services ADD COLUMN description text`
- `src/components/BottomNav.tsx` -- reordenar itens
- `src/components/AppLayout.tsx` -- header mobile com menu ···
- `src/components/AppSidebar.tsx` -- mover WhatsApp
- `src/pages/Services.tsx` -- atalhos + descrição
- `src/pages/Yard.tsx` -- preço read-only + forma de pagamento

