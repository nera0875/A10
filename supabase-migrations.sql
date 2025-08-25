-- Migration pour l'application Mémoire RAG
-- À exécuter dans l'éditeur SQL de Supabase

-- Activer l'extension pgvector pour les embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Table des mémoires personnelles
CREATE TABLE IF NOT EXISTS memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536), -- Embeddings OpenAI text-embedding-3-small
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des documents importés
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT, -- Preview du contenu
    file_type TEXT NOT NULL, -- pdf, txt, md
    file_size INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des chunks de documents
CREATE TABLE IF NOT EXISTS chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    tokens INTEGER NOT NULL,
    embedding vector(1536),
    tsvector tsvector, -- Pour la recherche BM25
    chunk_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS memories_user_id_idx ON memories(user_id);
CREATE INDEX IF NOT EXISTS memories_embedding_idx ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS memories_created_at_idx ON memories(created_at DESC);

CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents(user_id);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON documents(created_at DESC);

CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS chunks_tsvector_idx ON chunks USING gin(tsvector);

-- Trigger pour mettre à jour le tsvector automatiquement
CREATE OR REPLACE FUNCTION update_chunks_tsvector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tsvector = to_tsvector('french', NEW.content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chunks_tsvector_update ON chunks;
CREATE TRIGGER chunks_tsvector_update
    BEFORE INSERT OR UPDATE ON chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_chunks_tsvector();

-- Activer Row Level Security
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour memories
DROP POLICY IF EXISTS "memories_select_own" ON memories;
CREATE POLICY "memories_select_own" ON memories FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "memories_insert_own" ON memories;
CREATE POLICY "memories_insert_own" ON memories FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "memories_update_own" ON memories;
CREATE POLICY "memories_update_own" ON memories FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "memories_delete_own" ON memories;
CREATE POLICY "memories_delete_own" ON memories FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour documents
DROP POLICY IF EXISTS "documents_select_own" ON documents;
CREATE POLICY "documents_select_own" ON documents FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_insert_own" ON documents;
CREATE POLICY "documents_insert_own" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_update_own" ON documents;
CREATE POLICY "documents_update_own" ON documents FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_delete_own" ON documents;
CREATE POLICY "documents_delete_own" ON documents FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour chunks
DROP POLICY IF EXISTS "chunks_select_own" ON chunks;
CREATE POLICY "chunks_select_own" ON chunks FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM documents WHERE documents.id = chunks.document_id)
);

DROP POLICY IF EXISTS "chunks_insert_own" ON chunks;
CREATE POLICY "chunks_insert_own" ON chunks FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM documents WHERE documents.id = chunks.document_id)
);

DROP POLICY IF EXISTS "chunks_update_own" ON chunks;
CREATE POLICY "chunks_update_own" ON chunks FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM documents WHERE documents.id = chunks.document_id)
);

DROP POLICY IF EXISTS "chunks_delete_own" ON chunks;
CREATE POLICY "chunks_delete_own" ON chunks FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM documents WHERE documents.id = chunks.document_id)
);

-- Fonction de recherche sémantique dans les mémoires
CREATE OR REPLACE FUNCTION search_memories(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    user_id uuid DEFAULT NULL
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
    WHERE (search_memories.user_id IS NULL OR memories.user_id = search_memories.user_id)
        AND memories.embedding IS NOT NULL
        AND 1 - (memories.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

-- Fonction de recherche sémantique dans les chunks
CREATE OR REPLACE FUNCTION search_chunks(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    user_id uuid DEFAULT NULL
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
    WHERE (search_chunks.user_id IS NULL OR documents.user_id = search_chunks.user_id)
        AND chunks.embedding IS NOT NULL
        AND 1 - (chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

-- Fonction de recherche hybride BM25 + sémantique
CREATE OR REPLACE FUNCTION hybrid_search_chunks(
    query_text text,
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    user_id uuid DEFAULT NULL
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
        WHERE (hybrid_search_chunks.user_id IS NULL OR documents.user_id = hybrid_search_chunks.user_id)
            AND chunks.embedding IS NOT NULL
            AND 1 - (chunks.embedding <=> query_embedding) > match_threshold
    ),
    bm25_search AS (
        SELECT 
            chunks.id,
            ts_rank(chunks.tsvector, plainto_tsquery('french', query_text)) as bm25_rank
        FROM chunks
        JOIN documents ON chunks.document_id = documents.id
        WHERE (hybrid_search_chunks.user_id IS NULL OR documents.user_id = hybrid_search_chunks.user_id)
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

-- Vue pour les statistiques utilisateur
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(DISTINCT m.id) as memory_count,
    COUNT(DISTINCT d.id) as document_count,
    COUNT(DISTINCT c.id) as chunk_count,
    SUM(d.file_size) as total_storage_bytes
FROM auth.users u
LEFT JOIN memories m ON u.id = m.user_id
LEFT JOIN documents d ON u.id = d.user_id
LEFT JOIN chunks c ON d.id = c.document_id
GROUP BY u.id, u.email;

-- Grant permissions pour les fonctions
GRANT EXECUTE ON FUNCTION search_memories TO authenticated;
GRANT EXECUTE ON FUNCTION search_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION hybrid_search_chunks TO authenticated;
GRANT SELECT ON user_stats TO authenticated;
