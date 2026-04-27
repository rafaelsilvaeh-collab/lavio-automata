
-- 1. profiles: bloqueio e último acesso
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- 2. app_settings (singleton)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY DEFAULT 1,
  plan_monthly_price numeric(10,2) NOT NULL DEFAULT 149,
  plan_semiannual_price numeric(10,2) NOT NULL DEFAULT 779,
  plan_semiannual_discount integer NOT NULL DEFAULT 13,
  plan_annual_price numeric(10,2) NOT NULL DEFAULT 1308,
  plan_annual_discount integer NOT NULL DEFAULT 27,
  trial_days integer NOT NULL DEFAULT 7,
  msg_completion_default text NOT NULL DEFAULT 'Olá {nome}! Seu {modelo} (placa {placa}) está pronto para retirada. Obrigado pela preferência! 🚗✨',
  msg_reactivation_default text NOT NULL DEFAULT 'Olá {nome}! Faz um tempo que não vemos seu {modelo} por aqui. Que tal agendar uma lavagem? 🚿',
  landing_headline text NOT NULL DEFAULT 'Seu pátio fica cheio e os clientes ficam perguntando no WhatsApp se o carro já está pronto?',
  landing_subheadline text NOT NULL DEFAULT 'O Lavgo avisa automaticamente o cliente quando o carro fica pronto, organiza seu caixa e mantém seus clientes voltando.',
  landing_video_url text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);

INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App settings are publicly readable" ON public.app_settings;
CREATE POLICY "App settings are publicly readable"
  ON public.app_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can update app settings" ON public.app_settings;
CREATE POLICY "Only admins can update app settings"
  ON public.app_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Admin-only SELECT policies em todas as tabelas de negócio
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;
CREATE POLICY "Admins can view all customers"
  ON public.customers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all cars" ON public.cars_in_yard;
CREATE POLICY "Admins can view all cars"
  ON public.cars_in_yard FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all cash flow" ON public.cash_flow_entries;
CREATE POLICY "Admins can view all cash flow"
  ON public.cash_flow_entries FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all services" ON public.services;
CREATE POLICY "Admins can view all services"
  ON public.services FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all whatsapp configs" ON public.whatsapp_config;
CREATE POLICY "Admins can view all whatsapp configs"
  ON public.whatsapp_config FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all message templates" ON public.message_templates;
CREATE POLICY "Admins can view all message templates"
  ON public.message_templates FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. admin_list_users() — agregados por usuário
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  business_name text,
  phone text,
  created_at timestamptz,
  last_seen_at timestamptz,
  onboarding_completed boolean,
  is_blocked boolean,
  customers_count bigint,
  cars_count bigint,
  last_service_at timestamptz,
  whatsapp_connected boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    u.email::text,
    p.business_name,
    p.phone,
    p.created_at,
    p.last_seen_at,
    p.onboarding_completed,
    p.is_blocked,
    COALESCE(c.cnt, 0) AS customers_count,
    COALESCE(car.cnt, 0) AS cars_count,
    car.last_at AS last_service_at,
    COALESCE(w.is_connected, false) AS whatsapp_connected
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS cnt FROM public.customers GROUP BY user_id
  ) c ON c.user_id = p.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS cnt, MAX(created_at) AS last_at FROM public.cars_in_yard GROUP BY user_id
  ) car ON car.user_id = p.user_id
  LEFT JOIN public.whatsapp_config w ON w.user_id = p.user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC;
$$;

-- 5. admin_metrics() — agregados globais
CREATE OR REPLACE FUNCTION public.admin_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'onboarded_users', (SELECT COUNT(*) FROM public.profiles WHERE onboarding_completed = true),
    'blocked_users', (SELECT COUNT(*) FROM public.profiles WHERE is_blocked = true),
    'whatsapp_connected', (SELECT COUNT(*) FROM public.whatsapp_config WHERE is_connected = true),
    'total_customers', (SELECT COUNT(*) FROM public.customers),
    'total_cars', (SELECT COUNT(*) FROM public.cars_in_yard),
    'notifications_sent_30d', (
      SELECT COUNT(*) FROM public.cars_in_yard
      WHERE notification_status = 'sent' AND notification_sent_at >= now() - interval '30 days'
    ),
    'notifications_total_30d', (
      SELECT COUNT(*) FROM public.cars_in_yard
      WHERE scheduled_notification_time IS NOT NULL
        AND scheduled_notification_time >= now() - interval '30 days'
    ),
    'active_users_7d', (
      SELECT COUNT(*) FROM public.profiles WHERE last_seen_at >= now() - interval '7 days'
    ),
    'users_by_month', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.month), '[]'::jsonb)
      FROM (
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
               COUNT(*) AS count
        FROM public.profiles
        WHERE created_at >= now() - interval '12 months'
        GROUP BY 1
      ) t
    ),
    'cars_by_month', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.month), '[]'::jsonb)
      FROM (
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
               COUNT(*) AS count
        FROM public.cars_in_yard
        WHERE created_at >= now() - interval '12 months'
        GROUP BY 1
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- 6. Promover o admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'rafael.silva.eh@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
