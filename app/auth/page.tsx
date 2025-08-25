'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Forcer la page à être dynamique
export const dynamic = 'force-dynamic'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSignIn = async () => {
    setLoading(true)
    setMessage('')
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage('Erreur de connexion: ' + error.message)
    } else {
      router.push('/memories')
    }
    setLoading(false)
  }

  const handleSignUp = async () => {
    setLoading(true)
    setMessage('')
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage('Erreur d\'inscription: ' + error.message)
    } else {
      setMessage('Vérifiez votre email pour confirmer votre compte')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Mémoire</h1>
          <p className="mt-2 text-gray-600">Votre assistant intelligent de mémoire</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentification</CardTitle>
            <CardDescription>
              Connectez-vous ou créez un compte pour accéder à vos mémoires
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleSignIn} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </Button>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleSignUp} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Inscription...' : 'S\'inscrire'}
                </Button>
              </TabsContent>
            </Tabs>
            
            {message && (
              <div className={`mt-4 p-3 rounded ${
                message.includes('Erreur') 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
