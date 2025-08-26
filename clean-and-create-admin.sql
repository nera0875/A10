-- Script pour nettoyer et créer un utilisateur administrateur
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Nettoyer d'abord les tentatives précédentes (si elles existent)
DELETE FROM auth.identities WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'admin@memoire.app'
);

DELETE FROM auth.users WHERE email = 'admin@memoire.app';

-- 2. Créer l'utilisateur admin
INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
) VALUES (
    gen_random_uuid(),                    -- id
    'authenticated',                      -- aud
    'authenticated',                      -- role
    'admin@memoire.app',                 -- email
    crypt('admin123', gen_salt('bf')),   -- encrypted_password (mot de passe: admin123)
    NOW(),                               -- email_confirmed_at (confirmé immédiatement)
    NULL,                                -- invited_at
    '',                                  -- confirmation_token
    NULL,                                -- confirmation_sent_at
    '',                                  -- recovery_token
    NULL,                                -- recovery_sent_at
    '',                                  -- email_change_token_new
    '',                                  -- email_change
    NULL,                                -- email_change_sent_at
    NULL,                                -- last_sign_in_at
    '{"provider": "email", "providers": ["email"]}', -- raw_app_meta_data
    '{}',                                -- raw_user_meta_data
    FALSE,                               -- is_super_admin
    NOW(),                               -- created_at
    NOW(),                               -- updated_at
    NULL,                                -- phone
    NULL,                                -- phone_confirmed_at
    '',                                  -- phone_change
    '',                                  -- phone_change_token
    NULL,                                -- phone_change_sent_at
    '',                                  -- email_change_token_current
    0,                                   -- email_change_confirm_status
    NULL,                                -- banned_until
    '',                                  -- reauthentication_token
    NULL                                 -- reauthentication_sent_at
);

-- 3. Créer l'identité pour l'utilisateur
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'admin@memoire.app'),
    jsonb_build_object(
        'sub', (SELECT id FROM auth.users WHERE email = 'admin@memoire.app')::text,
        'email', 'admin@memoire.app'
    ),
    'email',
    (SELECT id FROM auth.users WHERE email = 'admin@memoire.app')::text, -- provider_id
    NOW(),
    NOW(),
    NOW()
);

-- 4. Vérification : afficher l'utilisateur créé
SELECT 
    u.id, 
    u.email, 
    u.email_confirmed_at, 
    u.created_at,
    i.provider,
    i.provider_id IS NOT NULL as has_identity
FROM auth.users u
LEFT JOIN auth.identities i ON u.id = i.user_id
WHERE u.email = 'admin@memoire.app';

-- 5. Message de succès
SELECT 'Utilisateur admin créé avec succès! Email: admin@memoire.app, Mot de passe: admin123' as message;
