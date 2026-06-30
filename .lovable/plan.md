## Atualizar credenciais da Evolution API

Atualizar os secrets no backend com a nova URL e chave fornecidas:

- `EVOLUTION_API_URL` = `https://evolution-api-production-6379.up.railway.app`
- `EVOLUTION_API_KEY` = `156692f73f747c979b1e6b4fb5f460d2aaf1a9ea8a63bdd4cfef51e11c887152`

### Validação pós-atualização
1. `curl` direto na nova URL (`/manager/fetchInstances`) usando a nova key para confirmar que responde 200.
2. Chamar a edge function `admin-evolution` (diagnóstico) para validar conexão end-to-end.
3. Reportar status (OK / erro com detalhes) ao usuário.

Nenhuma alteração de código é necessária — as edge functions `whatsapp`, `admin-actions`, `admin-evolution` e `send-scheduled-notifications` já leem essas variáveis de ambiente.
