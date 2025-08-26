#!/usr/bin/env node
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
