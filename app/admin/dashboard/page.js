'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('artbit-admin-theme')
    if (saved === 'light') setDarkMode(false)
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin')
      return
    }
    setUser(user)
    setLoading(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/admin')
  }

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('artbit-admin-theme', next ? 'dark' : 'light')
  }

  const bg = darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f2ede1]'
  const text = darkMode ? 'text-white' : 'text-[#000000]'
  const muted = darkMode ? 'text-white/50' : 'text-[#333]/70'
  const card = darkMode
    ? 'border border-white/10 bg-[#111] hover:border-white/25'
    : 'border border-black/10 bg-white hover:border-black/25'
  const headerBorder = darkMode ? 'border-white/10' : 'border-black/10'

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} ${text} flex items-center justify-center font-mono text-sm`}>
        Loading...
      </div>
    )
  }

  const cards = [
    { href: '/admin/products', label: 'Products' },
    { href: '/admin/orders', label: 'Orders' },
    { href: '/admin/coupons', label: 'Coupons' },
    { href: '/admin/custom-requests', label: 'Custom Requests' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/site-content', label: 'Site Content' },
    { href: '/admin/your-art', label: 'Your Art' }
  ]

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      <header className={`border-b ${headerBorder} px-5 sm:px-8 py-4 flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <span className="font-black uppercase tracking-tight text-lg">Artbit</span>
          <span className={`text-[10px] font-mono uppercase ${muted}`}>Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono hidden sm:block ${muted}`}>
            {user?.email}
          </span>
          <button
            onClick={logout}
            className={`text-[10px] font-mono uppercase border px-3 py-1.5 ${
              darkMode ? 'border-white/20' : 'border-black/20'
            }`}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
        <h1 className="text-2xl font-black uppercase mb-8 tracking-tight">Dashboard</h1>

        <div className="grid sm:grid-cols-2 gap-4">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`block p-6 transition ${card}`}
            >
              <p className={`text-[10px] font-mono uppercase mb-1 ${muted}`}>Manage</p>
              <p className="text-lg font-semibold">{c.label}</p>
            </Link>
          ))}
        </div>
      </main>

      <button
        onClick={toggleTheme}
        className={`fixed bottom-5 right-5 text-[10px] font-mono uppercase border px-3 py-2 ${
          darkMode ? 'border-white/20 text-white/70' : 'border-black/20 text-black/70'
        }`}
      >
        {darkMode ? 'Light' : 'Dark'}
      </button>
    </div>
  )
}