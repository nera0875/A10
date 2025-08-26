import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Brain, FileText, MessageSquare, Settings, TrendingUp, LogOut, Zap, Menu } from 'lucide-react'

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/memories" className="flex items-center space-x-2">
                <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-gray-900" />
                <span className="text-lg sm:text-xl font-bold text-gray-900">A01</span>
              </Link>
              
              {/* Navigation desktop */}
              <div className="hidden lg:flex ml-8 space-x-2">
                <Link href="/memories">
                  <Button variant="ghost" className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <Brain className="h-4 w-4" />
                    <span>Mémoires</span>
                  </Button>
                </Link>
                <Link href="/documents">
                  <Button variant="ghost" className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <FileText className="h-4 w-4" />
                    <span>Documents</span>
                  </Button>
                </Link>
                <Link href="/chat">
                  <Button variant="ghost" className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <MessageSquare className="h-4 w-4" />
                    <span>Chat</span>
                  </Button>
                </Link>
                <Link href="/neurons">
                  <Button variant="ghost" className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <Zap className="h-4 w-4" />
                    <span>Neurones</span>
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="ghost" className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <Settings className="h-4 w-4" />
                    <span>Paramètres</span>
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="ghost" className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <TrendingUp className="h-4 w-4" />
                    <span>Prix</span>
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:block text-sm text-gray-600 truncate max-w-32 sm:max-w-none">{user.email}</span>
              <form action="/auth/signout" method="post">
                <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
          
          {/* Navigation mobile */}
          <div className="lg:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-50 overflow-x-auto">
              <div className="flex lg:hidden space-x-2 pb-2 min-w-max">
                <Link href="/memories">
                  <Button variant="ghost" className="flex-shrink-0 justify-center px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <Brain className="h-4 w-4 mr-1" />
                    <span className="text-sm">Mémoires</span>
                  </Button>
                </Link>
                <Link href="/documents">
                  <Button variant="ghost" className="flex-shrink-0 justify-center px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <FileText className="h-4 w-4 mr-1" />
                    <span className="text-sm">Documents</span>
                  </Button>
                </Link>
                <Link href="/chat">
                  <Button variant="ghost" className="flex-shrink-0 justify-center px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span className="text-sm">Chat</span>
                  </Button>
                </Link>
                <Link href="/neurons">
                  <Button variant="ghost" className="flex-shrink-0 justify-center px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <Zap className="h-4 w-4 mr-1" />
                    <span className="text-sm">Neurones</span>
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="ghost" className="flex-shrink-0 justify-center px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <Settings className="h-4 w-4 mr-1" />
                    <span className="text-sm">Paramètres</span>
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="ghost" className="flex-shrink-0 justify-center px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm">Prix</span>
                  </Button>
                </Link>
              </div>
              <div className="lg:hidden space-y-1">
              </div>
              <div className="pt-2 border-t border-gray-200">
                <span className="block px-3 py-2 text-sm text-gray-600 truncate">{user.email}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto py-2 px-2 sm:py-4 sm:px-4 lg:py-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
