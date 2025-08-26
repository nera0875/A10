@echo off
echo 🔐 Récupération des secrets Doppler...

REM Vérifier si Doppler est installé
doppler --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Doppler non trouvé. Installation...
    winget install doppler.doppler
    echo ✅ Doppler installé
)

REM Configurer le projet si nécessaire
echo ⚙️ Configuration du projet global-secrets...
doppler setup --project global-secrets --config dev --no-interactive

REM Récupérer les secrets et créer .env.local
echo 📥 Récupération des secrets...
doppler secrets download --no-file --format env > .env.local

if %errorlevel% equ 0 (
    echo ✅ Fichier .env.local créé avec succès
    echo 📋 Contenu:
    type .env.local
) else (
    echo ❌ Erreur lors de la récupération
    exit /b 1
)

echo.
echo 🎉 Configuration terminée ! 
echo 💡 Démarrez votre app avec: npm run dev
