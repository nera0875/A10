-- Support pour les embeddings de différentes tailles (1536 et 3072 dimensions)

-- Ajouter une colonne pour stocker le modèle d'embedding utilisé
ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';

-- Créer des colonnes séparées pour les embeddings large (3072 dimensions)
ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding_large vector(3072);
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding_large vector(3072);
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS embedding_large vector(3072);

-- Créer des index pour les nouveaux embeddings
CREATE INDEX IF NOT EXISTS idx_memories_embedding_large ON memories USING ivfflat (embedding_large vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_large ON chunks USING ivfflat (embedding_large vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_embedding_large ON conversation_messages USING ivfflat (embedding_large vector_cosine_ops) WITH (lists = 100);

-- Mettre à jour la fonction de recherche pour supporter les deux tailles
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
    -- Utiliser l'embedding approprié selon ce qui est fourni
    IF query_embedding_large IS NOT NULL THEN
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
    ELSE
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
    END IF;
END;
$$;

-- Fonction similaire pour les chunks
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
    ELSE
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
    END IF;
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION search_memories_multi TO authenticated;
GRANT EXECUTE ON FUNCTION search_chunks_multi TO authenticated;