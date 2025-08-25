import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Forcer la page à être dynamique
export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    redirect('/memories')
  } else {
    redirect('/auth')
  }
}
