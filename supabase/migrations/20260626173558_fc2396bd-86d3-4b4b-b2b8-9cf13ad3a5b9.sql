-- Função que decide se o usuário pode acessar os dados protegidos pelo paywall
CREATE OR REPLACE FUNCTION public.is_subscription_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = _user_id
        AND (
          p.subscription_status = 'active'
          OR (p.trial_ends_at IS NOT NULL AND p.trial_ends_at > now())
        )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_subscription_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_subscription_active(uuid) TO authenticated, service_role;

-- Trava de paywall (RESTRICTIVE) nas tabelas multi-tenant
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers','cars_in_yard','cash_flow_entries','services','message_templates','whatsapp_config'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS subscription_required ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY subscription_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_subscription_active(auth.uid())) WITH CHECK (public.is_subscription_active(auth.uid()))',
      t
    );
  END LOOP;
END$$;