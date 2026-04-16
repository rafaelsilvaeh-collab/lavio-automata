

# Cadastro de Serviços e Integração com Caixa

## Contexto
A tabela `services` já existe no banco com campos `name`, `price`, `duration_minutes` e `user_id` com RLS. O dropdown de serviços no Pátio já busca do banco, mas está vazio porque não há tela para cadastrar serviços. Além disso, ao registrar um carro com serviço, o valor não é lançado no caixa.

## Alterações

### 1. Nova página de Serviços (`src/pages/Services.tsx`)
- CRUD completo de serviços: nome, preço (R$), duração (minutos)
- Lista dos serviços cadastrados em cards com opções de editar e excluir
- Dialog para adicionar/editar serviço
- Empty state: "Nenhum serviço cadastrado. Adicione seus tipos de lavagem para começar."
- Queries filtradas por `user_id` (RLS já garante)

### 2. Adicionar rota e navegação
- `src/App.tsx`: nova rota `/services` com `AppLayout`
- `src/components/AppSidebar.tsx`: item "Serviços" com ícone `Wrench` ou `Settings` entre "Clientes" e "Pátio"
- `src/components/BottomNav.tsx`: substituir um item ou reorganizar para incluir "Serviços" (avaliar espaço no mobile)

### 3. Integração Pátio → Caixa
- Em `src/pages/Yard.tsx`, no `handleRegister`: quando um serviço é selecionado, buscar o preço do serviço e criar automaticamente um `cash_flow_entries` do tipo `entrada` com categoria igual ao nome do serviço, valor igual ao preço, e data de hoje.

## Arquivos alterados
- **Novo**: `src/pages/Services.tsx`
- `src/App.tsx` — adicionar rota
- `src/components/AppSidebar.tsx` — adicionar link de navegação
- `src/components/BottomNav.tsx` — adicionar link de navegação
- `src/pages/Yard.tsx` — ao registrar carro com serviço, inserir entrada no caixa

