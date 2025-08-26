import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { url, key } = await request.json()
    
    if (!url || !key) {
      return NextResponse.json({ 
        error: 'URL et clé requis' 
      }, { status: 400 })
    }

    // Créer un client Supabase temporaire pour tester
    const testClient = createClient(url, key)
    
    // Tester la connexion en tentant une requête simple
    const { data, error } = await testClient
      .from('memories')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Erreur test Supabase:', error)
      return NextResponse.json({ 
        error: 'Connexion échouée: ' + error.message 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Connexion Supabase réussie',
      recordsFound: data?.length || 0
    })
  } catch (error) {
    console.error('Erreur test Supabase:', error)
    return NextResponse.json({ 
      error: 'Erreur lors du test de connexion' 
    }, { status: 500 })
  }
}
