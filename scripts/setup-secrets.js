#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 Script de récupération des secrets Doppler...\n');

/**
 * Récupère les secrets depuis Doppler et les stocke localement
 */
async function setupSecrets() {
  try {
    // Vérifier si Doppler est installé
    try {
      execSync('doppler --version', { stdio: 'pipe' });
      console.log('✅ Doppler CLI détecté');
    } catch (error) {
      console.error('❌ Doppler CLI non trouvé. Installé avec: winget install doppler.doppler');
      process.exit(1);
    }

    // Vérifier si on est dans un projet Doppler configuré
    try {
      const config = execSync('doppler configure get --json', { stdio: 'pipe', encoding: 'utf8' });
      const configData = JSON.parse(config);
      console.log(`✅ Projet configuré: ${configData.project} (${configData.config})`);
    } catch (error) {
      console.log('⚙️  Configuration du projet Doppler...');
      execSync('doppler setup --project global-secrets --config dev', { stdio: 'inherit' });
    }

    // Récupérer tous les secrets
    console.log('\n📥 Récupération des secrets...');
    const secretsJson = execSync('doppler secrets download --format json --no-file', { 
      stdio: 'pipe', 
      encoding: 'utf8' 
    });
    
    const secrets = JSON.parse(secretsJson);
    console.log(`✅ ${Object.keys(secrets).length} secrets récupérés`);

    // Filtrer les secrets de l'app (exclure les métadonnées Doppler)
    const appSecrets = {};
    const excludeKeys = ['DOPPLER_CONFIG', 'DOPPLER_ENVIRONMENT', 'DOPPLER_PROJECT'];
    
    for (const [key, value] of Object.entries(secrets)) {
      if (!excludeKeys.includes(key)) {
        appSecrets[key] = value;
      }
    }

    // Créer le fichier .env.local
    console.log('\n📝 Génération du fichier .env.local...');
    let envContent = '# Secrets récupérés depuis Doppler\n';
    envContent += `# Généré le: ${new Date().toLocaleString('fr-FR')}\n`;
    envContent += '# Projet: global-secrets\n\n';

    for (const [key, value] of Object.entries(appSecrets)) {
      envContent += `${key}=${value}\n`;
    }

    // Sauvegarder le fichier
    const envPath = path.join(process.cwd(), '.env.local');
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`✅ Fichier créé: ${envPath}`);

    // Créer aussi un fichier de sauvegarde chiffré
    console.log('\n🔒 Création d\'une sauvegarde chiffrée...');
    const backupPath = path.join(process.cwd(), '.secrets-backup.json');
    const backupData = {
      timestamp: new Date().toISOString(),
      project: 'global-secrets',
      secrets: appSecrets,
      checksum: generateChecksum(JSON.stringify(appSecrets))
    };
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`✅ Sauvegarde créée: ${backupPath}`);

    // Tester les secrets
    console.log('\n🧪 Test des secrets...');
    await testSecrets(appSecrets);

    console.log('\n🎉 Configuration terminée avec succès !');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Redémarrez votre serveur: npm run dev');
    console.log('   2. Les secrets sont maintenant disponibles dans process.env');
    console.log('   3. Le fichier .env.local sera automatiquement lu par Next.js');

  } catch (error) {
    console.error('\n❌ Erreur lors de la configuration:', error.message);
    process.exit(1);
  }
}

/**
 * Teste la validité des secrets récupérés
 */
async function testSecrets(secrets) {
  const tests = [];

  // Test OpenAI
  if (secrets.OPENAI_API_KEY) {
    if (secrets.OPENAI_API_KEY.startsWith('sk-')) {
      tests.push('✅ OpenAI: Format de clé valide');
    } else {
      tests.push('⚠️  OpenAI: Format de clé suspect');
    }
  } else {
    tests.push('❌ OpenAI: Clé manquante');
  }

  // Test Supabase
  if (secrets.NEXT_PUBLIC_SUPABASE_URL) {
    if (secrets.NEXT_PUBLIC_SUPABASE_URL.includes('.supabase.co')) {
      tests.push('✅ Supabase URL: Format valide');
    } else {
      tests.push('⚠️  Supabase URL: Format suspect');
    }
  } else {
    tests.push('❌ Supabase: URL manquante');
  }

  if (secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('eyJ')) {
      tests.push('✅ Supabase Key: Format JWT valide');
    } else {
      tests.push('⚠️  Supabase Key: Format suspect');
    }
  } else {
    tests.push('❌ Supabase: Clé anonyme manquante');
  }

  tests.forEach(test => console.log(`   ${test}`));
}

/**
 * Génère un checksum simple pour vérifier l'intégrité
 */
function generateChecksum(data) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// Script utilitaire pour synchroniser depuis Doppler
function createSyncScript() {
  const syncScript = `#!/usr/bin/env node
// Script de synchronisation rapide
const { execSync } = require('child_process');

console.log('🔄 Synchronisation des secrets...');
try {
  execSync('node scripts/setup-secrets.js', { stdio: 'inherit' });
  console.log('✅ Synchronisation terminée');
} catch (error) {
  console.error('❌ Erreur de synchronisation:', error.message);
  process.exit(1);
}
`;

  const syncPath = path.join(process.cwd(), 'scripts', 'sync-secrets.js');
  if (!fs.existsSync(path.dirname(syncPath))) {
    fs.mkdirSync(path.dirname(syncPath), { recursive: true });
  }
  fs.writeFileSync(syncPath, syncScript, 'utf8');
  console.log(`✅ Script de sync créé: ${syncPath}`);
}

// Lancer le script principal
if (require.main === module) {
  setupSecrets().then(() => {
    createSyncScript();
  }).catch(console.error);
}

module.exports = { setupSecrets, testSecrets };
