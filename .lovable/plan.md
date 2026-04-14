

# Remover dados mock e conectar ao banco real

## Contexto

O projeto já possui todas as tabelas necessárias no banco (`customers`, `services`, `cars_in_yard`, `cash_flow_entries`, etc.) com RLS por `user_id`, que já garante isolamento por estabelecimento (1 usuário = 1 estabelecimento). Não é necessário criar tabelas novas nem renomear as existentes.

O que precisa mudar: remover todos os dados hardcoded dos componentes e conectar ao Supabase real.

## Alterações

### 1. Dashboard -- conectar ao banco real
- Remover arrays `stats` e listas hardcoded
- Buscar métricas reais via queries ao Supabase:
  - Carros no pátio: `cars_in_yard` com status != 'entregue'
  - Em lavagem: `cars_in_yard` com status = 'em_lavagem'
  - Finalizados hoje: `cars_in_yard` finalizados no dia
  - Faturamento: `cash_flow_entries` tipo 'entrada' do dia
  - Atendidos hoje: count de `cars_in_yard` criados hoje
- Card "Carros no pátio" busca dados reais com join em `customers`
- Card "Resumo do dia" busca `cash_flow_entries` agrupados por categoria
- Exibir zeros quando não há dados

### 2. CashFlow -- remover mock, conectar ao banco
- Remover array `mockEntries` e `useState` com mock
- Buscar `cash_flow_entries` filtrado por `entry_date` selecionado e `user_id`
- Formulários de entrada/saída fazem INSERT real no Supabase
- Adicionar card de "Saldo inicial" que aparece apenas quando não há nenhum lançamento:
  - Detectar via count de `cash_flow_entries` do usuário
  - Campo para informar valor + botão "Definir saldo inicial"
  - Link "Começar do zero" que oculta o card
  - Ao definir, cria lançamento tipo 'entrada', categoria 'Saldo inicial'
- Empty state: "Nenhuma movimentação ainda"

### 3. Yard -- remover mock, conectar ao banco
- Remover `mockCars` array
- Buscar `cars_in_yard` com join em `customers` e `services`
- Registrar carro faz INSERT real (select de clientes e serviços do banco)
- Avançar status faz UPDATE real
- Empty state já existe, manter

### 4. Admin -- remover mock data
- Remover `mockUsers` e métricas hardcoded
- Para métricas SaaS (MRR, churn) que dependem de dados do Stripe/admin: exibir zeros com nota "Dados disponíveis após integração"
- Manter configuração de planos e landing page funcional

### 5. Customers -- adicionar painel de detalhes
- Ao clicar num cliente, abrir Sheet/modal lateral com:
  - Nome, telefone, veículo, placa
  - Último serviço (query `cars_in_yard` com join em `services`)
  - Histórico dos últimos 10 serviços
  - Status de retorno (verde/amarelo/vermelho baseado em `last_wash_date`)
- Busca com debounce de 300ms (já existe busca, adicionar debounce)

### 6. Nenhuma migração de banco necessária
- Tabelas existentes já possuem a estrutura correta
- RLS por `user_id` já garante isolamento
- `cash_flow_entries` já suporta tipo 'entrada'/'saida' e categoria

## Arquivos alterados
- `src/pages/Dashboard.tsx` -- reescrever com queries reais
- `src/pages/CashFlow.tsx` -- reescrever com queries reais + saldo inicial
- `src/pages/Yard.tsx` -- reescrever com queries reais
- `src/pages/Admin.tsx` -- remover mocks, exibir zeros
- `src/pages/Customers.tsx` -- adicionar painel de detalhes + debounce

