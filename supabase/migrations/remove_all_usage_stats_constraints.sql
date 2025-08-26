-- Vérifier et supprimer toutes les contraintes de clé étrangère sur usage_stats
DO $$ 
BEGIN
    -- Supprimer la contrainte user_id si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'usage_stats_user_id_fkey' 
               AND table_name = 'usage_stats') THEN
        ALTER TABLE usage_stats DROP CONSTRAINT usage_stats_user_id_fkey;
    END IF;
    
    -- Supprimer la contrainte conversation_id si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'usage_stats_conversation_id_fkey' 
               AND table_name = 'usage_stats') THEN
        ALTER TABLE usage_stats DROP CONSTRAINT usage_stats_conversation_id_fkey;
    END IF;
    
    -- Supprimer la contrainte message_id si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'usage_stats_message_id_fkey' 
               AND table_name = 'usage_stats') THEN
        ALTER TABLE usage_stats DROP CONSTRAINT usage_stats_message_id_fkey;
    END IF;
END $$;

-- Rendre toutes les colonnes de référence nullable
ALTER TABLE usage_stats ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE usage_stats ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE usage_stats ALTER COLUMN message_id DROP NOT NULL;

-- Ajouter des index pour les performances
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_stats_created_at ON usage_stats(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_stats_model_used ON usage_stats(model_used);