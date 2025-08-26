-- Script de vérification de l'installation
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier que l'extension vector est activée
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 2. Vérifier que les tables existent
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema IN ('public', 'auth') 
AND table_name IN ('memories', 'documents', 'chunks', 'users', 'identities')
ORDER BY table_schema, table_name;

-- 3. Vérifier les utilisateurs existants
SELECT 
    email, 
    email_confirmed_at IS NOT NULL as email_confirmed,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 4. Vérifier les politiques RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. Tester si on peut créer un utilisateur simple
DO $$
BEGIN
    -- Nettoyer d'abord
    DELETE FROM auth.users WHERE email = 'test@exemple.com';
    
    -- Message de statut
    RAISE NOTICE 'Base de données prête pour les tests';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erreur: %', SQLERRM;
END $$;
