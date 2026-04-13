

# Criar usuário administrador do Lavgo

## Credenciais
- **E-mail:** Rafael.silva.eh@gmail.com
- **Senha:** Dara3770@

## Passos

1. **Criar edge function temporária** (`create-admin`) que usa o `SUPABASE_SERVICE_ROLE_KEY` para:
   - Criar o usuário via `supabase.auth.admin.createUser()` com e-mail confirmado automaticamente
   - Inserir a role `admin` na tabela `user_roles`

2. **Invocar a edge function** para criar a conta

3. **Remover a edge function** após uso (segurança)

## Detalhes técnicos
- A edge function usará `createClient` com a service role key para ter permissões administrativas
- O usuário será criado com `email_confirm: true` para pular verificação de e-mail
- A role `admin` será inserida na tabela `user_roles` vinculada ao `user_id` do novo usuário

