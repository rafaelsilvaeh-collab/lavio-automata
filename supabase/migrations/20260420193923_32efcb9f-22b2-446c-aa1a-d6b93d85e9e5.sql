-- Modo treino
ALTER TABLE public.cash_flow_entries ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- Foto e observações + preço/serviço efetivos no registro do pátio
ALTER TABLE public.cars_in_yard ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.cars_in_yard ADD COLUMN IF NOT EXISTS entry_notes text;
ALTER TABLE public.cars_in_yard ADD COLUMN IF NOT EXISTS final_price numeric;
ALTER TABLE public.cars_in_yard ADD COLUMN IF NOT EXISTS ad_hoc_service_name text;

-- Bucket privado para fotos de veículos
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-photos', 'vehicle-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage isoladas por user_id (folder = user_id)
DROP POLICY IF EXISTS "users upload own vehicle photos" ON storage.objects;
CREATE POLICY "users upload own vehicle photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users read own vehicle photos" ON storage.objects;
CREATE POLICY "users read own vehicle photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users delete own vehicle photos" ON storage.objects;
CREATE POLICY "users delete own vehicle photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users update own vehicle photos" ON storage.objects;
CREATE POLICY "users update own vehicle photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);