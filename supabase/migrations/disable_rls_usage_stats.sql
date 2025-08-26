-- Temporairement désactiver RLS pour permettre les tests
ALTER TABLE usage_stats DISABLE ROW LEVEL SECURITY;

-- Accorder toutes les permissions aux rôles
GRANT ALL PRIVILEGES ON usage_stats TO authenticated;
GRANT ALL PRIVILEGES ON usage_stats TO anon;
GRANT ALL PRIVILEGES ON usage_stats TO postgres;

-- Vérifier les permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'usage_stats' 
ORDER BY table_name, grantee;