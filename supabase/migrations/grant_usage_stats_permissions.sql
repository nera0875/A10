-- Accorder les permissions de base aux rôles
GRANT ALL PRIVILEGES ON usage_stats TO authenticated;
GRANT SELECT, INSERT ON usage_stats TO anon;

-- Vérifier les permissions actuelles
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'usage_stats' 
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;