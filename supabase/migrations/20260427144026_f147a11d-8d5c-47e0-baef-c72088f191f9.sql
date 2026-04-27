ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status text;

UPDATE public.profiles p
SET trial_ends_at = p.created_at + ((SELECT trial_days FROM public.app_settings WHERE id = 1) || ' days')::interval
WHERE p.trial_ends_at IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_trial_days int;
BEGIN
  SELECT COALESCE(trial_days, 7) INTO v_trial_days FROM public.app_settings WHERE id = 1;
  IF v_trial_days IS NULL THEN v_trial_days := 7; END IF;
  INSERT INTO public.profiles (user_id, trial_ends_at)
  VALUES (NEW.id, now() + (v_trial_days || ' days')::interval);
  RETURN NEW;
END;
$function$;

DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  user_id uuid, email text, business_name text, phone text,
  created_at timestamptz, last_seen_at timestamptz,
  onboarding_completed boolean, is_blocked boolean,
  customers_count bigint, cars_count bigint,
  last_service_at timestamptz, whatsapp_connected boolean,
  trial_ends_at timestamptz, subscription_status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    COALESCE(w.is_connected, false) AS whatsapp_connected,
    p.trial_ends_at,
    p.subscription_status
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
$function$;