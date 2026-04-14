

# Migrar Z-API para Evolution API + Atualizar Preços

## 1. Migrar para Evolution API

### Edge Function (`supabase/functions/whatsapp/index.ts`)
Reescrever completamente para usar Evolution API v1.8.x:

- Ler `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` dos secrets do Deno em cada handler (nunca no topo)
- Gerar `instanceName` dinamicamente: `lavgo_${userId.replace(/-/g,'').slice(0,16)}`
- Remover campos `instance_id` e `api_key` do fluxo do cliente -- as credenciais são do admin, não do cliente

**Actions implementadas:**
| Action | Método | Endpoint Evolution |
|--------|--------|--------------------|
| `create-instance` | POST | `/instance/create` com `{ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" }` |
| `get-qrcode` | GET | `/instance/connect/{instanceName}` |
| `check-status` | GET | `/instance/connectionState/{instanceName}` |
| `send-message` | POST | `/message/sendText/{instanceName}` |
| `disconnect` | DELETE | `/instance/logout/{instanceName}` |

- Remover action `save-config` (credenciais agora são globais do admin)
- Erro descritivo se `EVOLUTION_API_URL` vazia

### Secrets necessários
Adicionar 2 secrets via ferramenta `add_secret`:
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`

### Página WhatsApp (`src/pages/WhatsApp.tsx`)
- Remover card "Configuração Z-API" (Instance ID + Token) -- cliente não configura nada
- Remover estados `instanceId`, `apiKey`, `handleSaveConfig`
- Remover `hasConfig` -- a instância é criada automaticamente
- Botão "Conectar WhatsApp" chama `create-instance` + `get-qrcode` em sequência
- Polling automático a cada 5s via `check-status` enquanto QR Code estiver visível
- Quando `state === "open"`, atualizar UI para "Conectado" automaticamente
- Botão "Reconectar" quando desconectado (chama `get-qrcode` novamente)
- Remover todas as referências textuais a "Z-API"

### Admin (`src/pages/Admin.tsx`)
- Remover referências a Z-API (não precisa de aba WhatsApp pois credenciais são secrets globais)

## 2. Atualizar Preços

### Landing Page (`src/pages/Landing.tsx`)
Substituir o objeto `prices` e redesenhar a seção de pricing:

```text
prices = {
  monthly:    { price: 149, label: 'Mensal',    discount: null,     stripeLink: '...' },
  semiannual: { price: 129, label: 'Semestral', discount: '13% OFF', stripeLink: '...' },
  annual:     { price: 109, label: 'Anual',     discount: '27% OFF', stripeLink: '...' },
}
```

**Novo layout de pricing:**
- Toggle de período no topo (destaca o selecionado)
- 3 cards lado a lado sempre visíveis (1 coluna mobile, 3 desktop)
- Cada card mostra apenas preço mensal equivalente (nunca total do período)
- Desconto como badge verde no card (Semestral e Anual)
- Badge "Mais popular" acima do card Semestral
- Linha centralizada abaixo dos cards: "🔓 7 dias grátis, sem cartão de crédito"

### Admin (`src/pages/Admin.tsx`)
- Atualizar defaults de preço: monthly=149, semiannualDiscount=13, annualDiscount=27

## 3. Verificação Final
- Criar `.env.example` com `VITE_EVOLUTION_API_URL=` e `VITE_EVOLUTION_API_KEY=` documentados
- Confirmar zero referências a Z-API, preços antigos (110, 96.80, 85.80) eliminados
- Nenhum valor total de período visível

## Arquivos alterados
- `supabase/functions/whatsapp/index.ts` -- reescrever para Evolution API
- `src/pages/WhatsApp.tsx` -- simplificar, remover config Z-API, adicionar polling
- `src/pages/Landing.tsx` -- novos preços + layout 3 cards
- `src/pages/Admin.tsx` -- atualizar defaults
- `.env.example` -- criar com variáveis Evolution API

