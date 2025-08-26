-- Vérifier les permissions actuelles des tables de conversation
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'conversation_messages')
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Accorder les permissions nécessaires aux rôles anon et authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_messages TO authenticated;

-- Accorder les permissions de lecture aux utilisateurs anonymes (optionnel)
GRANT SELECT ON conversations TO anon;
GRANT SELECT ON conversation_messages TO anon;

-- Vérifier à nouveau les permissions après les modifications
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'conversation_messages')
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;