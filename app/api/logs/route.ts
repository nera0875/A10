import { NextRequest, NextResponse } from 'next/server'

interface LogEntry {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info' | 'success'
  category: string
  message: string
  details?: any
}

// Stockage en mémoire pour les logs
let logs: LogEntry[] = []

export async function GET() {
  try {
    // Retourner les 100 derniers logs
    const recentLogs = logs.slice(-100)
    
    return NextResponse.json({ logs: recentLogs })
  } catch (error) {
    console.error('Erreur récupération logs:', error)
    return NextResponse.json({ logs: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { level, category, message, details } = await request.json()
    
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    }
    
    logs.push(newLog)
    
    // Garder seulement les 1000 derniers logs en mémoire
    if (logs.length > 1000) {
      logs = logs.slice(-1000)
    }
    
    return NextResponse.json({ success: true, log: newLog })
  } catch (error) {
    console.error('Erreur ajout log:', error)
    return NextResponse.json({ error: 'Erreur ajout log' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    logs = []
    return NextResponse.json({ success: true, message: 'Logs supprimés' })
  } catch (error) {
    console.error('Erreur suppression logs:', error)
    return NextResponse.json({ error: 'Erreur suppression logs' }, { status: 500 })
  }
}
