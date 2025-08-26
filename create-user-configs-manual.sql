-- Script SQL à exécuter manuellement dans Supabase
-- Allez sur: https://supabase.com/dashboard → SQL Editor → Nouveau query

-- 1. Créer la table user_configs
CREATE TABLE IF NOT EXISTS public.user_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_type TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Contrainte unique pour éviter les doublons
  UNIQUE(user_id, config_type)
);

-- 2. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON public.user_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_configs_type ON public.user_configs(config_type);

-- 3. RLS (Row Level Security)
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view own configs" ON public.user_configs;
DROP POLICY IF EXISTS "Users can insert own configs" ON public.user_configs;
DROP POLICY IF EXISTS "Users can update own configs" ON public.user_configs;
DROP POLICY IF EXISTS "Users can delete own configs" ON public.user_configs;

-- 5. Créer les nouvelles policies
CREATE POLICY "Users can view own configs" ON public.user_configs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own configs" ON public.user_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own configs" ON public.user_configs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own configs" ON public.user_configs
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_configs_updated_at ON public.user_configs;
CREATE TRIGGER update_user_configs_updated_at 
  BEFORE UPDATE ON public.user_configs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Vérification
SELECT 'Table user_configs créée avec succès!' as status;
