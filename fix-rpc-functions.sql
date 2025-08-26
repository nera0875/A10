-- Supprimer les anciennes fonctions avec les paramètres conflictuels
DROP FUNCTION IF EXISTS search_memories(vector(1536), float, int, uuid);
DROP FUNCTION IF EXISTS search_chunks(vector(1536), float, int, uuid);
DROP FUNCTION IF EXISTS hybrid_search_chunks(text, vector(1536), float, int, uuid);

-- Fonction de recherche sémantique dans les mémoires (corrigée)
CREATE OR REPLACE FUNCTION search_memories(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    target_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    content text,
    similarity float,
    created_at timestamptz,
    updated_at timestamptz,
    user_id uuid
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        memories.id,
        memories.content,
        1 - (memories.embedding <=> query_embedding) as similarity,
        memories.created_at,
        memories.updated_at,
        memories.user_id
    FROM memories
    WHERE (target_user_id IS NULL OR memories.user_id = target_user_id)
        AND memories.embedding IS NOT NULL
        AND 1 - (memories.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

-- Fonction de recherche sémantique dans les chunks (corrigée)
CREATE OR REPLACE FUNCTION search_chunks(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    target_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    content text,
    similarity float,
    document_id uuid,
    chunk_index int,
    created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        chunks.id,
        chunks.content,
        1 - (chunks.embedding <=> query_embedding) as similarity,
        chunks.document_id,
        chunks.chunk_index,
        chunks.created_at
    FROM chunks
    JOIN documents ON chunks.document_id = documents.id
    WHERE (target_user_id IS NULL OR documents.user_id = target_user_id)
        AND chunks.embedding IS NOT NULL
        AND 1 - (chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

-- Fonction de recherche hybride BM25 + sémantique (corrigée)
CREATE OR REPLACE FUNCTION hybrid_search_chunks(
    query_text text,
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    target_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    content text,
    semantic_similarity float,
    bm25_rank float,
    hybrid_score float,
    document_id uuid,
    chunk_index int,
    created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
    WITH semantic_search AS (
        SELECT 
            chunks.id,
            chunks.content,
            1 - (chunks.embedding <=> query_embedding) as semantic_similarity,
            chunks.document_id,
            chunks.chunk_index,
            chunks.created_at
        FROM chunks
        JOIN documents ON chunks.document_id = documents.id
        WHERE (target_user_id IS NULL OR documents.user_id = target_user_id)
            AND chunks.embedding IS NOT NULL
            AND 1 - (chunks.embedding <=> query_embedding) > match_threshold
    ),
    bm25_search AS (
        SELECT 
            chunks.id,
            ts_rank(chunks.tsvector, plainto_tsquery('french', query_text)) as bm25_rank
        FROM chunks
        JOIN documents ON chunks.document_id = documents.id
        WHERE (target_user_id IS NULL OR documents.user_id = target_user_id)
            AND chunks.tsvector @@ plainto_tsquery('french', query_text)
    )
    SELECT 
        s.id,
        s.content,
        s.semantic_similarity,
        COALESCE(b.bm25_rank, 0) as bm25_rank,
        (s.semantic_similarity * 0.7 + COALESCE(b.bm25_rank, 0) * 0.3) as hybrid_score,
        s.document_id,
        s.chunk_index,
        s.created_at
    FROM semantic_search s
    LEFT JOIN bm25_search b ON s.id = b.id
    ORDER BY hybrid_score DESC
    LIMIT match_count;
$$;

-- Grant permissions pour les fonctions
GRANT EXECUTE ON FUNCTION search_memories TO authenticated;
GRANT EXECUTE ON FUNCTION search_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION hybrid_search_chunks TO authenticated;