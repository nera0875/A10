# Mémoire - Application RAG Intelligente

Une application de mémoire personnelle avec recherche sémantique et chat intelligent basé sur vos documents et mémoires.

## 🚀 Fonctionnalités

- **Authentification Supabase** : Connexion sécurisée
- **Gestion des mémoires** : CRUD avec recherche sémantique
- **Import de documents** : Support PDF, TXT, Markdown
- **Chat intelligent** : Questions/réponses avec citations des sources
- **Recherche hybride** : BM25 + similarité vectorielle
- **Interface moderne** : Next.js 14 + Tailwind CSS + shadcn/ui

## 🛠 Stack Technique

- **Frontend** : Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Backend** : Next.js API Routes + Supabase
- **Base de données** : PostgreSQL + pgvector (Supabase)
- **IA** : OpenAI API (embeddings + chat)
- **Authentification** : Supabase Auth
- **Déploiement** : Vercel

## 📋 Prérequis

- Node.js 18+
- Compte Supabase
- Clé API OpenAI
- Compte Vercel (pour le déploiement)

## 🏗 Installation

1. **Cloner le repository**
```bash
git clone <votre-repo-url>
cd memoire-rag-app
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration des variables d'environnement**
```bash
cp .env.example .env.local
```

Remplir les variables :
- `NEXT_PUBLIC_SUPABASE_URL` : URL de votre projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé anonyme Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé service role Supabase
- `OPENAI_API_KEY` : Votre clé API OpenAI

4. **Configuration de la base de données Supabase**

Exécuter les migrations SQL dans l'éditeur SQL de Supabase :

```sql
-- Activer pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Table des mémoires
CREATE TABLE memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des documents
CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des chunks
CREATE TABLE chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    tokens INTEGER NOT NULL,
    embedding vector(1536),
    tsvector tsvector,
    chunk_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour les performances
CREATE INDEX memories_user_id_idx ON memories(user_id);
CREATE INDEX memories_embedding_idx ON memories USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX documents_user_id_idx ON documents(user_id);

CREATE INDEX chunks_document_id_idx ON chunks(document_id);
CREATE INDEX chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX chunks_tsvector_idx ON chunks USING gin(tsvector);

-- RLS (Row Level Security)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour memories
CREATE POLICY "memories_select_own" ON memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "memories_insert_own" ON memories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "memories_update_own" ON memories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "memories_delete_own" ON memories FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour documents
CREATE POLICY "documents_select_own" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "documents_insert_own" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documents_update_own" ON documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "documents_delete_own" ON documents FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour chunks
CREATE POLICY "chunks_select_own" ON chunks FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM documents WHERE documents.id = chunks.document_id)
);
CREATE POLICY "chunks_insert_own" ON chunks FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM documents WHERE documents.id = chunks.document_id)
);
CREATE POLICY "chunks_update_own" ON chunks FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM documents WHERE documents.id = chunks.document_id)
);
CREATE POLICY "chunks_delete_own" ON chunks FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM documents WHERE documents.id = chunks.document_id)
);

-- Fonctions de recherche sémantique
CREATE OR REPLACE FUNCTION search_memories(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    user_id uuid
)
RETURNS TABLE(
    id uuid,
    content text,
    similarity float,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
AS $$
    SELECT 
        memories.id,
        memories.content,
        1 - (memories.embedding <=> query_embedding) as similarity,
        memories.created_at,
        memories.updated_at
    FROM memories
    WHERE memories.user_id = search_memories.user_id
        AND memories.embedding IS NOT NULL
        AND 1 - (memories.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION search_chunks(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    user_id uuid
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
    WHERE documents.user_id = search_chunks.user_id
        AND chunks.embedding IS NOT NULL
        AND 1 - (chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;
```

5. **Lancer l'application en développement**
```bash
npm run dev
```

L'application sera disponible sur http://localhost:3000

## 🚀 Déploiement sur Vercel

1. **Connecter votre repository à Vercel**
2. **Configurer les variables d'environnement dans Vercel**
3. **Déployer automatiquement**

## 📖 Guide d'utilisation

### 1. Authentification
- Créer un compte ou se connecter
- Confirmation par email requise

### 2. Gestion des mémoires
- Ajouter des mémoires personnelles
- Recherche sémantique dans vos mémoires
- Édition et suppression

### 3. Import de documents
- Glisser-déposer des fichiers PDF, TXT ou Markdown
- Chunking et indexation automatiques
- Visualisation des documents importés

### 4. Chat intelligent
- Poser des questions sur vos mémoires et documents
- Réponses avec citations des sources
- Interface conversationnelle intuitive

## 🔧 Architecture

```
app/
├── (dashboard)/          # Pages protégées
│   ├── memories/         # Gestion des mémoires
│   ├── documents/        # Import et gestion de documents
│   ├── chat/            # Interface de chat
│   └── layout.tsx       # Layout avec navigation
├── auth/                # Authentification
├── api/                 # Routes API
│   ├── memories/        # CRUD mémoires + embeddings
│   ├── search/          # Recherche sémantique
│   ├── ingest/          # Ingestion de documents
│   └── query/           # Chat RAG
├── globals.css          # Styles globaux
└── layout.tsx           # Layout racine

components/ui/           # Composants shadcn/ui
lib/
├── supabase/           # Clients Supabase
├── types.ts            # Types TypeScript
└── utils.ts            # Fonctions utilitaires
```

## 🛡 Sécurité

- **RLS (Row Level Security)** : Isolation des données par utilisateur
- **Authentification** : Supabase Auth avec JWT
- **Variables d'environnement** : Clés API sécurisées côté serveur
- **Validation** : Validation des entrées utilisateur

## 🤝 Contribution

1. Fork du projet
2. Créer une branche feature
3. Commit des changements
4. Push vers la branche
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT.

## 🆘 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation Supabase et OpenAI
- Vérifier les logs Vercel en cas de problème de déploiement
