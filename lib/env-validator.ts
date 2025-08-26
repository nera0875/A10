type EnvVariable = {
  name: string
  required: boolean
  default?: string
  description: string
}

const ENV_VARIABLES: EnvVariable[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'URL de votre projet Supabase'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Clé anonyme de Supabase'
  },
  {
    name: 'OPENAI_API_KEY',
    required: true,
    description: 'Clé API OpenAI'
  },
  {
    name: 'NEXT_PUBLIC_SITE_URL',
    required: false,
    default: 'http://localhost:3000',
    description: 'URL du site'
  }
]

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  missing: string[]
}

class EnvValidator {
  private static instance: EnvValidator
  private validationResult: ValidationResult | null = null

  static getInstance(): EnvValidator {
    if (!EnvValidator.instance) {
      EnvValidator.instance = new EnvValidator()
    }
    return EnvValidator.instance
  }

  validate(): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const missing: string[] = []

    console.log('🔍 Validation des variables d\'environnement...')

    for (const envVar of ENV_VARIABLES) {
      const value = process.env[envVar.name]

      if (!value) {
        if (envVar.required) {
          missing.push(envVar.name)
          errors.push(`❌ Variable requise manquante: ${envVar.name} - ${envVar.description}`)
        } else {
          warnings.push(`⚠️  Variable optionnelle manquante: ${envVar.name} (défaut: ${envVar.default})`)
        }
        continue
      }

      // Validation spécifique par type
      if (envVar.name.includes('SUPABASE_URL')) {
        if (!value.startsWith('https://') || !value.includes('.supabase.co')) {
          errors.push(`❌ URL Supabase invalide: ${envVar.name}`)
        }
      }

      if (envVar.name.includes('SUPABASE_ANON_KEY') || envVar.name.includes('OPENAI_API_KEY')) {
        if (value.length < 20) {
          errors.push(`❌ Clé trop courte: ${envVar.name}`)
        }
      }

      if (envVar.name.includes('OPENAI_API_KEY')) {
        if (!value.startsWith('sk-proj-') && !value.startsWith('sk-')) {
          errors.push(`❌ Format de clé OpenAI invalide: ${envVar.name}`)
        }
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0 && missing.length === 0,
      errors,
      warnings,
      missing
    }

    this.validationResult = result
    this.logResults(result)
    
    return result
  }

  private logResults(result: ValidationResult) {
    console.log('\n📋 RÉSULTATS DE VALIDATION:')
    console.log('================================')
    
    if (result.isValid) {
      console.log('✅ Toutes les variables d\'environnement sont valides!')
    } else {
      console.log('❌ Problèmes détectés:')
    }

    if (result.errors.length > 0) {
      console.log('\n🚨 ERREURS:')
      result.errors.forEach(error => console.log(`  ${error}`))
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  AVERTISSEMENTS:')
      result.warnings.forEach(warning => console.log(`  ${warning}`))
    }

    if (result.missing.length > 0) {
      console.log('\n📋 VARIABLES MANQUANTES:')
      result.missing.forEach(missing => {
        const envVar = ENV_VARIABLES.find(v => v.name === missing)
        console.log(`  • ${missing}: ${envVar?.description}`)
      })
    }

    console.log('================================\n')
  }

  getValidationResult(): ValidationResult | null {
    return this.validationResult
  }

  generateEnvTemplate(): string {
    let template = '# Configuration automatique - MEMORY RAG App\n'
    template += '# Généré le: ' + new Date().toLocaleString('fr-FR') + '\n\n'

    ENV_VARIABLES.forEach(envVar => {
      template += `# ${envVar.description}\n`
      template += `${envVar.name}=${envVar.default || ''}\n\n`
    })

    template += '# Instructions:\n'
    template += '# 1. Remplacez les valeurs vides par vos vraies clés\n'
    template += '# 2. Sauvegardez ce fichier comme .env.local\n'
    template += '# 3. Redémarrez le serveur (npm run dev)\n'

    return template
  }

  async createEnvFile(config: Record<string, string>): Promise<boolean> {
    try {
      const envContent = this.generateEnvFromConfig(config)
      
      // En production, on utiliserait fs.writeFile
      console.log('📝 Contenu .env.local à créer:')
      console.log('=====================================')
      console.log(envContent)
      console.log('=====================================')
      
      return true
    } catch (error) {
      console.error('❌ Erreur création fichier .env:', error)
      return false
    }
  }

  private generateEnvFromConfig(config: Record<string, string>): string {
    let content = '# Configuration automatique - MEMORY RAG App\n'
    content += '# Généré le: ' + new Date().toLocaleString('fr-FR') + '\n\n'

    ENV_VARIABLES.forEach(envVar => {
      const value = config[envVar.name] || envVar.default || ''
      content += `# ${envVar.description}\n`
      content += `${envVar.name}=${value}\n\n`
    })

    return content
  }

  // Méthode pour diagnostiquer les problèmes courants
  diagnoseCommonIssues(): string[] {
    const issues: string[] = []

    // Vérifier si on est côté client ou serveur
    if (typeof window !== 'undefined') {
      issues.push('⚠️  Validation exécutée côté client - certaines variables peuvent être inaccessibles')
    }

    // Vérifier les variables Next.js
    const nextVars = Object.keys(process.env).filter(key => key.startsWith('NEXT_'))
    if (nextVars.length === 0) {
      issues.push('❌ Aucune variable NEXT_ détectée - problème de chargement possible')
    }

    // Vérifier l'environnement Node
    if (!process.env.NODE_ENV) {
      issues.push('⚠️  NODE_ENV non défini')
    }

    return issues
  }
}

// Hook pour React
export function useEnvValidation() {
  const validator = EnvValidator.getInstance()
  
  return {
    validate: () => validator.validate(),
    getResult: () => validator.getValidationResult(),
    generateTemplate: () => validator.generateEnvTemplate(),
    diagnose: () => validator.diagnoseCommonIssues()
  }
}

// Export de l'instance singleton
export const envValidator = EnvValidator.getInstance()

// Validation automatique au chargement du module
if (typeof window === 'undefined') {
  // Seulement côté serveur
  envValidator.validate()
}

