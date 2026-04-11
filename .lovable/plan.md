
# Lavio — SaaS de Gestão para Lava-Rápidos

## Visão Geral
Construir o Lavio completo: landing page, autenticação, dashboard do lava-rápido, CRM de clientes, gestão de pátio, fluxo de caixa, automação de WhatsApp e painel admin. Mobile-first, interface limpa e moderna.

## Design System
- **Cores**: Azul vibrante (#2563EB) como primária, gradientes suaves, fundo claro
- **Tipografia**: Inter (clean, moderna)
- **Estilo**: Cards arredondados, sombras sutis, ícones Lucide, interface mobile-first

## Fase 1: Landing Page
- Hero com headline estilo Challenger Sale (problema → quebra de crença → solução)
- Seção de vídeo demonstrativo (placeholder com player)
- 3 blocos de dados/estatísticas de mercado com ícones
- Tabela de preços: plano único R$110/mês com descontos semestral (12%) e anual (22%)
- CTA "Comece a usar agora — 7 dias grátis"
- Footer com suporte@lavio.app
- Totalmente responsiva

## Fase 2: Autenticação
- Login, cadastro e recuperação de senha via Lovable Cloud (Supabase Auth)
- Redirecionamento pós-login para dashboard
- Proteção de rotas autenticadas

## Fase 3: Dashboard do Lava-Rápido
- Visão geral: carros no pátio, em lavagem, finalizados
- Faturamento do dia e clientes atendidos
- Cards com números grandes, fácil leitura no celular
- Navegação por sidebar (desktop) e bottom nav (mobile)

## Fase 4: CRM de Clientes
- Cadastro: nome, telefone, modelo do carro, placa, observações
- Listagem com busca e filtros
- Histórico de serviços por cliente
- Status ativo/inativo, cliente recorrente
- Data da última lavagem

## Fase 5: Gestão do Pátio (Registro de Carros)
- Registrar carro: selecionar cliente, serviço, horário entrada
- Tempo estimado do serviço
- Status: aguardando → em lavagem → finalizado → cliente avisado → entregue
- Timeline visual do progresso
- Botão "Alterar horário do aviso" para ajuste manual
- Registro rápido (< 30 segundos)

## Fase 6: Fluxo de Caixa
- Tela "Caixa do Dia"
- Entradas: lavagem simples, completa, outros serviços
- Saídas: produtos, funcionários, outros custos
- Totais: entradas, saídas, resultado do dia
- Seletor de data para ver dias anteriores

## Fase 7: WhatsApp (Interface + Preparação para Z-API)
- Página "Conectar WhatsApp" com área para QR Code
- Status conectado/desconectado com botões reconectar/desconectar
- Mensagens automáticas configuráveis:
  - "Carro pronto" — enviada ao finalizar serviço
  - "Cliente inativo" — após 21 dias sem visita
- Templates de mensagem editáveis
- Interface completa preparada para integração com Z-API (será configurada quando a chave API estiver disponível)

## Fase 8: Stripe (Pagamentos)
- Habilitar integração Stripe para cobrança do plano SaaS
- Checkout para plano mensal/semestral/anual
- Gerenciamento de assinatura

## Fase 9: Painel Admin do SaaS
- Gestão de usuários: listar, ativar/desativar contas
- Métricas: MRR, número de clientes, churn, trials ativos, receita total
- Gestão de planos: editar preço e descontos
- Controle da landing page: editar headline, textos, vídeo, preços
- Protegido por role "admin" (tabela user_roles)

## Banco de Dados (Supabase/Lovable Cloud)
- Tabelas: profiles, customers, cars_in_yard, services, cash_flow_entries, whatsapp_config, message_templates, landing_page_content, user_roles
- RLS em todas as tabelas
- Dados isolados por tenant (multi-tenant via user_id)

## Responsividade
- Mobile-first em todas as telas
- Bottom navigation no mobile, sidebar no desktop
- Tabelas responsivas com cards no mobile
