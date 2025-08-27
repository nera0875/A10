-- Script pour corriger l'accès aux mémoires (version optimisée pour Supabase)
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier si les fonctions multi-embeddings existent
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_memories_multi') THEN
        RAISE NOTICE 'La fonction search_memories_multi n''existe pas. Création en cours...';
    ELSE
        RAISE NOTICE 'La fonction search_memories_multi existe déjà.';
    END IF;
END $$;

-- 2. S'assurer que les colonnes nécessaires existent
ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';
ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding_large vector(3072);

-- 3. Créer ou remplacer la fonction de recherche multi-embeddings
CREATE OR REPLACE FUNCTION search_memories_multi(
    query_embedding_small vector(1536) DEFAULT NULL,
    query_embedding_large vector(3072) DEFAULT NULL,
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    target_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity float,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Debug: Log des paramètres
    RAISE NOTICE 'search_memories_multi appelée avec: threshold=%, count=%, user_id=%', 
        match_threshold, match_count, target_user_id;
    
    -- Utiliser l'embedding approprié selon ce qui est fourni
    IF query_embedding_large IS NOT NULL THEN
        RAISE NOTICE 'Recherche avec embedding large';
        RETURN QUERY
        SELECT 
            m.id,
            m.content,
            1 - (m.embedding_large <=> query_embedding_large) AS similarity,
            m.created_at
        FROM memories m
        WHERE 
            (target_user_id IS NULL OR m.user_id = target_user_id)
            AND m.embedding_large IS NOT NULL
            AND 1 - (m.embedding_large <=> query_embedding_large) > match_threshold
        ORDER BY m.embedding_large <=> query_embedding_large
        LIMIT match_count;
    ELSIF query_embedding_small IS NOT NULL THEN
        RAISE NOTICE 'Recherche avec embedding small';
        RETURN QUERY
        SELECT 
            m.id,
            m.content,
            1 - (m.embedding <=> query_embedding_small) AS similarity,
            m.created_at
        FROM memories m
        WHERE 
            (target_user_id IS NULL OR m.user_id = target_user_id)
            AND m.embedding IS NOT NULL
            AND 1 - (m.embedding <=> query_embedding_small) > match_threshold
        ORDER BY m.embedding <=> query_embedding_small
        LIMIT match_count;
    ELSE
        RAISE NOTICE 'Aucun embedding fourni - retour de toutes les mémoires';
        -- Si aucun embedding n'est fourni, retourner les mémoires les plus récentes
        RETURN QUERY
        SELECT 
            m.id,
            m.content,
            1.0::float AS similarity,
            m.created_at
        FROM memories m
        WHERE 
            (target_user_id IS NULL OR m.user_id = target_user_id)
        ORDER BY m.created_at DESC
        LIMIT match_count;
    END IF;
END;
$$;

-- 4. Créer la fonction pour les chunks aussi
CREATE OR REPLACE FUNCTION search_chunks_multi(
    query_embedding_small vector(1536) DEFAULT NULL,
    query_embedding_large vector(3072) DEFAULT NULL,
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    target_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    document_id UUID,
    document_name TEXT,
    chunk_index INTEGER,
    similarity float,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF query_embedding_large IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            c.id,
            c.content,
            c.document_id,
            d.title as document_name,
            c.chunk_index,
            1 - (c.embedding_large <=> query_embedding_large) AS similarity,
            c.created_at
        FROM chunks c
        JOIN documents d ON d.id = c.document_id
        WHERE 
            (target_user_id IS NULL OR d.user_id = target_user_id)
            AND c.embedding_large IS NOT NULL
            AND 1 - (c.embedding_large <=> query_embedding_large) > match_threshold
        ORDER BY c.embedding_large <=> query_embedding_large
        LIMIT match_count;
    ELSIF query_embedding_small IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            c.id,
            c.content,
            c.document_id,
            d.title as document_name,
            c.chunk_index,
            1 - (c.embedding <=> query_embedding_small) AS similarity,
            c.created_at
        FROM chunks c
        JOIN documents d ON d.id = c.document_id
        WHERE 
            (target_user_id IS NULL OR d.user_id = target_user_id)
            AND c.embedding IS NOT NULL
            AND 1 - (c.embedding <=> query_embedding_small) > match_threshold
        ORDER BY c.embedding <=> query_embedding_small
        LIMIT match_count;
    ELSE
        -- Retourner les chunks les plus récents si pas d'embedding
        RETURN QUERY
        SELECT 
            c.id,
            c.content,
            c.document_id,
            d.title as document_name,
            c.chunk_index,
            1.0::float AS similarity,
            c.created_at
        FROM chunks c
        JOIN documents d ON d.id = c.document_id
        WHERE 
            (target_user_id IS NULL OR d.user_id = target_user_id)
        ORDER BY c.created_at DESC
        LIMIT match_count;
    END IF;
END;
$$;

-- 5. Accorder les permissions
GRANT EXECUTE ON FUNCTION search_memories_multi TO authenticated;
GRANT EXECUTE ON FUNCTION search_chunks_multi TO authenticated;
GRANT EXECUTE ON FUNCTION search_memories_multi TO anon;
GRANT EXECUTE ON FUNCTION search_chunks_multi TO anon;

-- 6. IMPORTANT: Créer des index optimisés pour Supabase
-- Version 1: Index avec moins de listes (utilise moins de mémoire)
BEGIN;
-- Essayer d'abord avec 50 listes
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
COMMIT;

BEGIN;
CREATE INDEX IF NOT EXISTS idx_memories_embedding_large ON memories USING ivfflat (embedding_large vector_cosine_ops) WITH (lists = 50);
COMMIT;

-- Si les index ci-dessus échouent encore, essayer avec encore moins de listes:
-- CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 25);
-- CREATE INDEX IF NOT EXISTS idx_memories_embedding_large ON memories USING ivfflat (embedding_large vector_cosine_ops) WITH (lists = 25);

-- Alternative: créer des index normaux sans ivfflat (moins performants mais fonctionnent toujours)
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);

-- 7. Vérifier les mémoires existantes
SELECT 
    COUNT(*) as total_memories,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_small_embedding,
    COUNT(CASE WHEN embedding_large IS NOT NULL THEN 1 END) as with_large_embedding
FROM memories;

-- 8. Test rapide de la fonction
SELECT * FROM search_memories_multi(
    query_embedding_small := NULL,
    query_embedding_large := NULL,
    match_threshold := 0.1,
    match_count := 10,
    target_user_id := NULL
);