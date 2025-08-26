import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Clé API requise' 
      }, { status: 400 })
    }

    // Créer un client OpenAI temporaire pour tester
    const testClient = new OpenAI({
      apiKey: apiKey
    })
    
    // Tester la connexion avec une requête simple
    const response = await testClient.models.list()
    
    if (response.data && response.data.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Connexion OpenAI réussie',
        modelsFound: response.data.length
      })
    } else {
      return NextResponse.json({ 
        error: 'Aucun modèle trouvé' 
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Erreur test OpenAI:', error)
    
    if (error.status === 401) {
      return NextResponse.json({ 
        error: 'Clé API invalide' 
      }, { status: 401 })
    }
    
    return NextResponse.json({ 
      error: 'Erreur lors du test: ' + (error.message || 'Erreur inconnue')
    }, { status: 500 })
  }
}
