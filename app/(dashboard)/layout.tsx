import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import Link from 'next/link'
import { Brain, FileText, MessageSquare, Settings, TrendingUp, LogOut, Zap } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth')
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/memories" className="flex items-center space-x-2">
                <Brain className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold text-foreground">A01</span>
              </Link>
              
              <div className="flex space-x-4">
                <Link href="/memories">
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Brain className="h-4 w-4" />
                    <span>Mémoires</span>
                  </Button>
                </Link>
                <Link href="/documents">
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Documents</span>
                  </Button>
                </Link>
                <Link href="/chat">
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>Chat</span>
                  </Button>
                </Link>
                <Link href="/neurons">
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span>Neurones</span>
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Paramètres</span>
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Prix</span>
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <ThemeToggle />
              <form action="/auth/signout" method="post">
                <Button variant="ghost" size="sm">
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
