'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LogoWithText } from '@/components/ui/logo'
import { logger } from '@/lib/logger'
import Image from 'next/image'

import { Eye, EyeOff } from 'lucide-react'

// Forcer la page à être dynamique
export const dynamic = 'force-dynamic'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Si Supabase n'est pas configuré, afficher un message d'erreur
  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Configuration requise</h1>
          <p className="text-sm sm:text-base text-gray-600">Les variables d'environnement Supabase ne sont pas configurées.</p>
        </div>
      </div>
    )
  }

  const handleSignIn = async () => {
    setLoading(true)
    setMessage('')
    
    logger.auth(`Tentative de connexion pour ${email}`)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const errorMsg = 'Erreur de connexion: ' + error.message
      setMessage(errorMsg)
      logger.error(errorMsg, { 
        category: 'Auth', 
        details: { email, error: error.message } 
      })
    } else {
      logger.success(`Connexion réussie pour ${email}`, { category: 'Auth' })
      router.push('/memories')
    }
    setLoading(false)
  }

  const handleSignUp = async () => {
    setLoading(true)
    setMessage('')
    
    logger.auth(`Tentative d'inscription pour ${email}`)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
        }
      })

      if (error) {
        const errorMsg = 'Erreur d\'inscription: ' + error.message
        setMessage(errorMsg)
        logger.error(errorMsg, { 
          category: 'Auth', 
          details: { email, error: error.message } 
        })
        setLoading(false)
        return
      }

      if (data.user) {
        setMessage('Compte créé ! Tentative de connexion...')
        logger.success(`Compte créé pour ${email}`, { category: 'Auth' })
        
        setTimeout(async () => {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          
          if (signInError) {
            const errorMsg = 'Compte créé mais connexion échouée'
            setMessage(errorMsg)
            logger.warning(errorMsg, { 
              category: 'Auth', 
              details: { email, error: signInError.message } 
            })
          } else {
            logger.success(`Connexion automatique réussie pour ${email}`, { category: 'Auth' })
            router.push('/memories')
          }
          setLoading(false)
        }, 2000)
        return
      }
    } catch (err: any) {
      const errorMsg = 'Erreur lors de la création du compte'
      setMessage(errorMsg)
      logger.error(errorMsg, { 
        category: 'Auth', 
        details: { email, error: err.message } 
      })
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 iphone-optimized">
      {/* Static background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 sm:-top-40 -right-20 sm:-right-40 w-40 sm:w-80 h-40 sm:h-80 bg-gray-50/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 sm:-bottom-40 -left-20 sm:-left-40 w-40 sm:w-80 h-40 sm:h-80 bg-gray-100/30 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 auth-container">
        <div className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8 auth-card">
          {/* Logo and branding */}
          <div className="text-center">
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                <Image src="/logo.svg" alt="A01 Logo" width={40} height={40} className="w-10 h-10 sm:w-12 sm:h-12" />
                <span className="font-bold text-gray-900 text-2xl sm:text-3xl tracking-tight">
                  A01
                </span>
              </div>
            </div>
            <div className="text-center text-gray-600 text-base sm:text-lg font-medium">
              <span>Beyond the limits of AI</span>
            </div>
          </div>

          {/* Main auth card */}
          <div className="relative">
            <div className="absolute inset-0 bg-white/60 rounded-2xl sm:rounded-3xl blur-xl opacity-60" />
            <Card className="relative backdrop-blur-xl bg-white border border-gray-200 shadow-lg rounded-2xl sm:rounded-3xl overflow-hidden mobile-transition">
              <CardHeader className="relative text-center pb-6 sm:pb-8 pt-6 sm:pt-8 px-6 sm:px-8">
                <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                  Bienvenue
                </CardTitle>
                <CardDescription className="text-gray-600 text-base sm:text-lg font-medium">
                  Connectez-vous ou créez un compte pour commencer
                </CardDescription>
              </CardHeader>
              <CardContent className="relative px-6 sm:px-8 pb-6 sm:pb-8">
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-gray-200 h-10 sm:h-12">
                    <TabsTrigger 
                      value="signin" 
                      className="flex-1 h-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-600 rounded-lg sm:rounded-xl px-2 sm:px-4 mobile-transition"
                    >
                      Connexion
                    </TabsTrigger>
                    <TabsTrigger 
                      value="signup" 
                      className="flex-1 h-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-600 rounded-lg sm:rounded-xl px-2 sm:px-4 mobile-transition"
                    >
                      Inscription
                    </TabsTrigger>
                  </TabsList>
              
                  <TabsContent value="signup" className="space-y-4 sm:space-y-6 mt-6 sm:mt-8">
                    <div className="space-y-4 sm:space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-sm font-semibold text-gray-700">
                          Adresse email
                        </Label>
                        <div className="relative">
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="votre@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-4 pr-4 py-3 sm:py-4 text-base sm:text-lg bg-white border border-gray-300 rounded-xl focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-colors placeholder:text-gray-400 mobile-input"
                            required
                            aria-describedby="signup-email-help"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm font-semibold text-gray-700">
                          Mot de passe
                        </Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Mot de passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-4 pr-12 py-3 sm:py-4 text-base sm:text-lg bg-white border border-gray-300 rounded-xl focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-colors placeholder:text-gray-400 mobile-input"
                            required
                            aria-describedby="signup-password-help"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleSignUp}
                      disabled={loading}
                      className="w-full py-3 sm:py-4 text-base sm:text-lg font-semibold bg-black hover:bg-gray-800 text-white rounded-xl shadow-sm hover:shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mobile-button"
                      aria-describedby="signup-loading"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span className="text-sm sm:text-base">Création du compte...</span>
                        </div>
                      ) : (
                        <span>Créer un compte</span>
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="signin" className="space-y-4 sm:space-y-6 mt-6 sm:mt-8">
                    <div className="space-y-4 sm:space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-sm font-semibold text-gray-700">
                          Adresse email
                        </Label>
                        <div>
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="votre@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-10 sm:h-12 rounded-xl border border-gray-300 transition-colors bg-white focus:border-gray-500 focus:ring-2 focus:ring-gray-200 text-base sm:text-lg mobile-input"
                            aria-describedby="signin-email-help"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password" className="text-sm font-semibold text-gray-700">
                            Mot de passe
                          </Label>
                          <button className="text-xs text-gray-500 hover:text-gray-700 transition-colors font-medium">
                            Mot de passe oublié ?
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            id="signin-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-10 sm:h-12 rounded-xl border border-gray-300 transition-colors bg-white pr-12 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 text-base sm:text-lg mobile-input"
                            aria-describedby="signin-password-help"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1"
                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                          >
                            {showPassword ? <EyeOff size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleSignIn}
                      disabled={loading}
                      className="w-full h-10 sm:h-12 bg-black hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors shadow-sm hover:shadow-md text-base sm:text-lg mobile-button"
                      aria-describedby="signin-loading"
                    >
                      {loading ? "Connexion..." : "Se connecter"}
                    </Button>
                  </TabsContent>
                </Tabs>
                
                {message && (
                  <div
                    className={`mt-4 sm:mt-6 message-banner ${
                      message.includes('Erreur') 
                        ? 'bg-gradient-to-r from-red-50 to-red-100/50 text-red-800 border-red-200/50' 
                        : 'bg-gradient-to-r from-green-50 to-green-100/50 text-green-800 border-green-200/50'
                    }`}
                    role="alert"
                    aria-live="polite"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        message.includes('Erreur') ? 'bg-red-500' : 'bg-green-500'
                      }`} />
                      <span className="font-medium text-sm sm:text-base">{message}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
         </div>
       </div>
    </div>
  )
}
