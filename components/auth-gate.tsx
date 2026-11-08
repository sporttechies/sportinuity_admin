'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  useEffect(() => { authApi.me().then(() => setReady(true)).catch(() => router.replace('/login')) }, [router])
  if (!ready) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Checking manager session…</div>
  return children
}
