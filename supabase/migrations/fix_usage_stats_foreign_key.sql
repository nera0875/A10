-- Supprimer la contrainte de clé étrangère problématique
-- La table usage_stats doit pouvoir accepter des user_id même si l'utilisateur n'est pas dans auth.users
ALTER TABLE usage_stats DROP CONSTRAINT IF EXISTS usage_stats_user_id_fkey;

-- Rendre user_id nullable pour permettre l'insertion même sans utilisateur authentifié
ALTER TABLE usage_stats ALTER COLUMN user_id DROP NOT NULL;

-- Ajouter un index pour les performances sur user_id
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id);

-- Ajouter un index sur created_at pour les requêtes de session
CREATE INDEX IF NOT EXISTS idx_usage_stats_created_at ON usage_stats(created_at);