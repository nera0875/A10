-- Migration corrective pour les problèmes de mémoire/contexte du LLM
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Ajouter les colonnes manquantes pour les embeddings large
ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';
ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding_large vector(3072);

ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding_large vector(3072);

-- Support des embeddings large pour les conversations
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS embedding_large vector(3072);

-- 2. Créer des index pour les nouveaux embeddings large
CREATE INDEX IF NOT EXISTS idx_memories_embedding_large ON memories USING ivfflat (embedding_large vector_cosine_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_large ON chunks USING ivfflat (embedding_large vector_cosine_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_embedding_large ON conversation_messages USING ivfflat (embedding_large vector_cosine_ops) WITH (lists = 50);

-- 3. Créer la fonction de recherche multi-embeddings pour les mémoires
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
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Si embedding large fourni, l'utiliser
    IF query_embedding_large IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            m.id,
            m.content,
            1 - (m.embedding_large <=> query_embedding_large) AS similarity,
            m.created_at,
            m.updated_at,
            m.user_id
        FROM memories m
        WHERE 
            (target_user_id IS NULL OR m.user_id = target_user_id)
            AND m.embedding_large IS NOT NULL
            AND 1 - (m.embedding_large <=> query_embedding_large) > match_threshold
        ORDER BY m.embedding_large <=> query_embedding_large
        LIMIT match_count;
    -- Sinon utiliser l'embedding small
    ELSIF query_embedding_small IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            m.id,
            m.content,
            1 - (m.embedding <=> query_embedding_small) AS similarity,
            m.created_at,
            m.updated_at,
            m.user_id
        FROM memories m
        WHERE 
            (target_user_id IS NULL OR m.user_id = target_user_id)
            AND m.embedding IS NOT NULL
            AND 1 - (m.embedding <=> query_embedding_small) > match_threshold
        ORDER BY m.embedding <=> query_embedding_small
        LIMIT match_count;
    -- Si aucun embedding, retourner les mémoires récentes
    ELSE
        RETURN QUERY
        SELECT 
            m.id,
            m.content,
            1.0::float AS similarity,
            m.created_at,
            m.updated_at,
            m.user_id
        FROM memories m
        WHERE 
            (target_user_id IS NULL OR m.user_id = target_user_id)
        ORDER BY m.created_at DESC
        LIMIT match_count;
    END IF;
END;
$$;

-- 4. Créer la fonction de recherche multi-embeddings pour les chunks
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
SECURITY DEFINER
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

-- 5. Créer une fonction de fallback pour récupérer toutes les mémoires d'un utilisateur
CREATE OR REPLACE FUNCTION get_all_user_memories(
    target_user_id UUID,
    memory_limit int DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity float,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    user_id UUID
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        m.id,
        m.content,
        1.0::float AS similarity,
        m.created_at,
        m.updated_at,
        m.user_id
    FROM memories m
    WHERE m.user_id = target_user_id
    ORDER BY m.created_at DESC
    LIMIT memory_limit;
$$;

-- 6. Créer une fonction de recherche simple par mots-clés comme fallback
CREATE OR REPLACE FUNCTION search_memories_text(
    search_text TEXT,
    target_user_id UUID DEFAULT NULL,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity float,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    user_id UUID
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        m.id,
        m.content,
        (
            CASE 
                WHEN m.content ILIKE '%' || search_text || '%' THEN 0.9
                WHEN similarity(m.content, search_text) > 0.3 THEN similarity(m.content, search_text)
                ELSE 0.1
            END
        ) AS similarity,
        m.created_at,
        m.updated_at,
        m.user_id
    FROM memories m
    WHERE 
        (target_user_id IS NULL OR m.user_id = target_user_id)
        AND (
            m.content ILIKE '%' || search_text || '%' 
            OR similarity(m.content, search_text) > 0.1
        )
    ORDER BY similarity DESC, m.created_at DESC
    LIMIT match_count;
$$;

-- 7. Créer une fonction de recherche multi-embeddings pour les conversations
CREATE OR REPLACE FUNCTION search_conversation_messages_multi(
    query_embedding_small vector(1536) DEFAULT NULL,
    query_embedding_large vector(3072) DEFAULT NULL,
    conversation_id_filter UUID DEFAULT NULL,
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    conversation_id UUID,
    role TEXT,
    content TEXT,
    similarity float,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
    IF query_embedding_large IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            cm.id,
            cm.conversation_id,
            cm.role,
            cm.content,
            1 - (cm.embedding_large <=> query_embedding_large) AS similarity,
            cm.created_at
        FROM conversation_messages cm
        JOIN conversations c ON c.id = cm.conversation_id
        WHERE 
            c.user_id = auth.uid()
            AND (conversation_id_filter IS NULL OR cm.conversation_id = conversation_id_filter)
            AND cm.embedding_large IS NOT NULL
            AND 1 - (cm.embedding_large <=> query_embedding_large) > match_threshold
        ORDER BY cm.embedding_large <=> query_embedding_large
        LIMIT match_count;
    ELSIF query_embedding_small IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            cm.id,
            cm.conversation_id,
            cm.role,
            cm.content,
            1 - (cm.embedding <=> query_embedding_small) AS similarity,
            cm.created_at
        FROM conversation_messages cm
        JOIN conversations c ON c.id = cm.conversation_id
        WHERE 
            c.user_id = auth.uid()
            AND (conversation_id_filter IS NULL OR cm.conversation_id = conversation_id_filter)
            AND cm.embedding IS NOT NULL
            AND 1 - (cm.embedding <=> query_embedding_small) > match_threshold
        ORDER BY cm.embedding <=> query_embedding_small
        LIMIT match_count;
    ELSE
        -- Fallback sans embedding : retourner les messages récents
        RETURN QUERY
        SELECT 
            cm.id,
            cm.conversation_id,
            cm.role,
            cm.content,
            1.0::float AS similarity,
            cm.created_at
        FROM conversation_messages cm
        JOIN conversations c ON c.id = cm.conversation_id
        WHERE 
            c.user_id = auth.uid()
            AND (conversation_id_filter IS NULL OR cm.conversation_id = conversation_id_filter)
        ORDER BY cm.created_at DESC
        LIMIT match_count;
    END IF;
END;
$;

-- 8. Accorder les permissions appropriées
GRANT EXECUTE ON FUNCTION search_memories_multi TO authenticated;
GRANT EXECUTE ON FUNCTION search_chunks_multi TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_user_memories TO authenticated;
GRANT EXECUTE ON FUNCTION search_memories_text TO authenticated;
GRANT EXECUTE ON FUNCTION search_conversation_messages_multi TO authenticated;

-- 9. Ajouter l'extension pour la fonction similarity si pas déjà là
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 10. Vérifier les données existantes
DO $$
DECLARE
    mem_count INT;
    chunk_count INT;
BEGIN
    SELECT COUNT(*) INTO mem_count FROM memories;
    SELECT COUNT(*) INTO chunk_count FROM chunks;
    
    RAISE NOTICE 'Migration terminée - Mémoires: %, Chunks: %', mem_count, chunk_count;
END $$;

-- 11. Test rapide des fonctions
SELECT 'Testing search_memories_multi...' AS test_name;
SELECT COUNT(*) as results_count FROM search_memories_multi(
    query_embedding_small := NULL,
    query_embedding_large := NULL,
    match_threshold := 0.1,
    match_count := 5,
    target_user_id := NULL
);
