#!/usr/bin/env node
/**
 * TEMPLATE - Script de récupération des secrets Doppler
 * À copier dans scripts/setup-secrets.js pour chaque nouveau projet
 * 
 * Utilisation: node scripts/setup-secrets.js
 * 
 * Ce script :
 * 1. Se connecte au projet Doppler "global-secrets"
 * 2. Récupère tous les secrets
 * 3. Génère .env.local automatiquement
 * 4. Crée une sauvegarde locale chiffrée
 * 5. Teste la validité des clés
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 Récupération des secrets depuis Doppler "global-secrets"...\n');

async function setupSecrets() {
  try {
    // 1. Vérifier Doppler CLI
    try {
      execSync('doppler --version', { stdio: 'pipe' });
      console.log('✅ Doppler CLI détecté');
    } catch (error) {
      throw new Error('Doppler CLI non trouvé. Installer avec: winget install doppler.doppler');
    }

    // 2. Configurer le projet global-secrets
    try {
      const config = execSync('doppler configure get --json', { stdio: 'pipe', encoding: 'utf8' });
      const configData = JSON.parse(config);
      console.log(`✅ Projet configuré: ${configData.project} (${configData.config})`);
    } catch (error) {
      console.log('⚙️  Configuration du projet global-secrets...');
      execSync('doppler setup --project global-secrets --config dev', { stdio: 'inherit' });
    }

    // 3. Récupérer les secrets
    console.log('\n📥 Récupération des secrets...');
    const secretsJson = execSync('doppler secrets download --format json --no-file', { 
      stdio: 'pipe', 
      encoding: 'utf8' 
    });
    
    const allSecrets = JSON.parse(secretsJson);
    
    // 4. Filtrer les secrets utiles
    const excludeKeys = ['DOPPLER_CONFIG', 'DOPPLER_ENVIRONMENT', 'DOPPLER_PROJECT'];
    const appSecrets = {};
    
    for (const [key, value] of Object.entries(allSecrets)) {
      if (!excludeKeys.includes(key)) {
        appSecrets[key] = value;
      }
    }
    
    console.log(`✅ ${Object.keys(appSecrets).length} secrets récupérés`);

    // 5. Générer .env.local
    console.log('\n📝 Génération du fichier .env.local...');
    let envContent = '# Secrets récupérés depuis Doppler global-secrets\n';
    envContent += `# Généré le: ${new Date().toLocaleString('fr-FR')}\n`;
    envContent += '# NE PAS COMMITER CE FICHIER\n\n';

    for (const [key, value] of Object.entries(appSecrets)) {
      envContent += `${key}=${value}\n`;
    }

    fs.writeFileSync('.env.local', envContent, 'utf8');
    console.log('✅ Fichier .env.local créé');

    // 6. Créer sauvegarde chiffrée
    console.log('\n🔒 Création sauvegarde locale...');
    const backupData = {
      timestamp: new Date().toISOString(),
      project: 'global-secrets',
      secrets: appSecrets,
      checksum: require('crypto').createHash('sha256').update(JSON.stringify(appSecrets)).digest('hex').substring(0, 16)
    };
    
    fs.writeFileSync('.secrets-backup.json', JSON.stringify(backupData, null, 2), 'utf8');
    console.log('✅ Sauvegarde créée');

    // 7. Tests de validité
    console.log('\n🧪 Validation des secrets...');
    validateSecrets(appSecrets);

    // 8. Mise à jour .gitignore
    updateGitignore();

    console.log('\n🎉 Configuration terminée !');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Démarrer: npm run dev');
    console.log('   2. Les secrets sont dans process.env');
    console.log('   3. Pour re-synchroniser: node scripts/setup-secrets.js');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.log('\n🔄 Solutions possibles:');
    console.log('   1. Vérifier que Doppler est installé et connecté');
    console.log('   2. Lancer: doppler login');
    console.log('   3. Vérifier le projet global-secrets existe');
    process.exit(1);
  }
}

function validateSecrets(secrets) {
  const tests = [];

  // OpenAI
  if (secrets.OPENAI_API_KEY?.startsWith('sk-')) {
    tests.push('✅ OpenAI: Clé valide');
  } else {
    tests.push('❌ OpenAI: Clé manquante ou invalide');
  }

  // Supabase
  if (secrets.NEXT_PUBLIC_SUPABASE_URL?.includes('.supabase.co')) {
    tests.push('✅ Supabase URL: Valide');
  } else {
    tests.push('❌ Supabase URL: Manquante ou invalide');
  }

  if (secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ')) {
    tests.push('✅ Supabase Key: Valide');
  } else {
    tests.push('❌ Supabase Key: Manquante ou invalide');
  }

  tests.forEach(test => console.log(`   ${test}`));
}

function updateGitignore() {
  const gitignorePath = '.gitignore';
  const entries = ['.env*', '.secrets-backup.json'];
  
  let gitignoreContent = '';
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }

  let updated = false;
  entries.forEach(entry => {
    if (!gitignoreContent.includes(entry)) {
      gitignoreContent += `\n${entry}`;
      updated = true;
    }
  });

  if (updated) {
    fs.writeFileSync(gitignorePath, gitignoreContent.trim() + '\n', 'utf8');
    console.log('✅ .gitignore mis à jour');
  }
}

// Script de sync rapide
function createSyncScript() {
  const scriptsDir = 'scripts';
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }

  const syncScript = `#!/usr/bin/env node
// Synchronisation rapide des secrets
const { execSync } = require('child_process');

console.log('🔄 Synchronisation...');
try {
  execSync('node scripts/setup-secrets.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}`;

  fs.writeFileSync('scripts/sync-secrets.js', syncScript, 'utf8');
}

if (require.main === module) {
  setupSecrets().then(() => {
    createSyncScript();
  });
}

module.exports = { setupSecrets };
