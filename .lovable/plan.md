

# Integração Completa: Clientes + WhatsApp

## 1. Página de Clientes (`src/pages/Customers.tsx`)

Reescrever para usar dados reais do banco via Supabase SDK:

- **Listar clientes**: `supabase.from('customers').select('*').order('created_at', { ascending: false })`
- **Criar cliente**: Form com estado controlado, insert no banco com `user_id` do auth context
- **Busca**: Filtro client-side sobre os dados reais (mantém UX atual)
- **Loading/empty states**: Skeleton enquanto carrega, mensagem quando vazio
- Remover mock data e interface `Customer` local (usar tipos gerados)

## 2. Página WhatsApp (`src/pages/WhatsApp.tsx`)

Reescrever para conectar à edge function `whatsapp` e às tabelas `whatsapp_config` e `message_templates`:

**Aba Conexão**:
- Adicionar campos para **Instance ID** e **Token Z-API** com botão "Salvar configuração" (chama edge function `save-config`)
- Botão "Gerar QR Code" chama edge function `get-qrcode` e exibe imagem base64 retornada
- Botão "Verificar Status" chama `check-status`
- Botão "Desconectar" chama `disconnect`
- Carregar config existente do banco ao montar (`whatsapp_config`)

**Aba Mensagens**:
- Carregar templates da tabela `message_templates` (tipos `car_ready` e `inactive_client`)
- Salvar/editar templates via upsert no banco
- Criar templates padrão se não existirem

**Aba Enviar** (nova):
- Select de cliente (da tabela `customers`)
- Textarea para mensagem (pode usar template)
- Botão enviar que chama edge function `send-message`

## 3. Chamadas à Edge Function

Usar `supabase.functions.invoke('whatsapp', { body: { action, ...params } })` para todas as operações. O token de auth é enviado automaticamente pelo SDK.

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/pages/Customers.tsx` | CRUD real com Supabase SDK |
| `src/pages/WhatsApp.tsx` | Integração com edge function + tabelas |

Nenhuma mudança no banco de dados necessária -- tabelas e RLS já existem.

