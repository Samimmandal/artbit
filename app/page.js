'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

function formatSizes(raw) {
  if (Array.isArray(raw)) return raw.join(', ')
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      if (Array.isArray(p)) return p.join(', ')
    } catch {}
    return raw
      .replace(/[\[\]"]/g, '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .join(', ')
  }
  return ''
}

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [homeArt, setHomeArt] = useState(null)
  const [darkMode, setDarkMode] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('artbit-theme')
    if (t === 'light') setDarkMode(false)
    loadData()
  }, [])

  const loadData = async () => {
    const [prodRes, artRes] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('homepage_art')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()
    ])
    setProducts(prodRes.data || [])
    setHomeArt(artRes.data || null)
    setLoading(false)
  }

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('artbit-theme', next ? 'dark' : 'light')
  }

  const bg = darkMode ? 'bg-black text-white' : 'bg-[#f2ede1] text-black'
  const muted = darkMode ? 'text-white/55' : 'text-black/55'
  const border = darkMode ? 'border-white/15' : 'border-black/15'
  const cardBg = darkMode ? 'bg-[#0a0a0a]' : 'bg-white'

  const featured = products.filter((p) => p.is_featured || p.featured)
  const list = featured.length ? featured : products

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <header className={`border-b ${border} px-4 py-3 flex items-center justify-between sticky top-0 z-40 ${darkMode ? 'bg-black/95' : 'bg-[#f2ede1]/95'} backdrop-blur`}>
        <Link href="/" className="flex items-center gap-2">
          <img
            src={darkMode ? '/logo-white.png' : '/logo.png'}
            alt="Artbit"
            className="h-8 w-auto"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <span className="font-black uppercase tracking-tight text-lg">Artbit</span>
        </Link>
        <nav className={`hidden md:flex gap-6 text-xs font-mono uppercase ${muted}`}>
          <Link href="/#shop">Shop</Link>
          <Link href="/#custom">Custom Prints</Link>
          <Link href="/#process">Process</Link>
          <Link href="/#contact">Contact</Link>
        </nav>
        <div className="flex items-center gap-4 text-base">
          <Link href="/wishlist" title="Wishlist" className="hover:opacity-70">
            ♡
          </Link>
          <Link href="/cart" title="Cart" className="hover:opacity-70">
            🛒
          </Link>
          <Link href="/account" title="My Orders" className="hover:opacity-70">
            👜
          </Link>
          <button type="button" onClick={toggleTheme} title="Theme" className="hover:opacity-70">
            {darkMode ? '☀' : '☾'}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className={`text-[11px] font-mono uppercase tracking-[0.2em] mb-3 ${muted}`}>
            Small batch · DTF print house
          </p>
          <h1 className="text-4xl md:text-5xl font-black uppercase leading-[0.95] tracking-tight">
            Design it.
            <br />
            We&apos;ll press it.
          </h1>
          <p className={`mt-4 max-w-md text-sm leading-relaxed ${muted}`}>
            Bring your own art. We print it on premium blanks — tees, hoodies, oversized & kids —
            batch by batch, made to keep.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/#shop"
              className="bg-[#2c6660] text-white px-6 py-3 text-xs font-mono uppercase"
            >
              Shop prints
            </Link>
            <Link
              href="/#custom"
              className={`border px-6 py-3 text-xs font-mono uppercase ${border}`}
            >
              Start your design
            </Link>
          </div>
          <div className={`mt-8 flex flex-wrap gap-4 text-[11px] font-mono uppercase ${muted}`}>
            <span>Tees</span>
            <span>·</span>
            <span>Hoodies</span>
            <span>·</span>
            <span>Oversized</span>
            <span>·</span>
            <span>Kids</span>
          </div>
        </div>

        {/* Your Art Here */}
        <div className={`aspect-square border ${border} overflow-hidden relative ${cardBg}`}>
          {homeArt?.image_url ? (
            <img
              src={homeArt.image_url}
              alt={homeArt.title || 'Your Art'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(128,128,128,0.12) 12px, rgba(128,128,128,0.12) 24px)'
              }}
            >
              <p className="font-black uppercase text-2xl tracking-tight opacity-40">
                Your Art Here
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Featured products */}
      <section id="shop" className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl font-black uppercase">Featured prints</h2>
          <Link href="/shop" className={`text-xs font-mono uppercase ${muted}`}>
            View all →
          </Link>
        </div>

        {loading ? (
          <p className={`font-mono text-sm ${muted}`}>Loading...</p>
        ) : list.length === 0 ? (
          <p className={`font-mono text-sm ${muted}`}>No products yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {list.map((p) => {
              const price = Number(p.price) || 0
              const compare = p.compare_at_price ? Number(p.compare_at_price) : null
              const sizesText = formatSizes(p.sizes)
              return (
                <Link
                  key={p.id}
                  href={`/product/${p.id}`}
                  className={`group border ${border} overflow-hidden ${cardBg}`}
                >
                  <div className="aspect-[4/5] overflow-hidden bg-black/5">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs opacity-30">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    {p.tag && (
                      <p className="text-[9px] font-mono uppercase tracking-wider text-[#2c6660]">
                        {p.tag}
                      </p>
                    )}
                    <h3 className="text-sm font-semibold uppercase leading-snug line-clamp-2">
                      {p.name}
                    </h3>
                    {/* Clean sizes — no quotes, no brackets */}
                    {sizesText ? (
                      <p className={`text-[11px] font-mono ${muted}`}>{sizesText}</p>
                    ) : null}
                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span className="text-sm font-semibold">
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      {compare && compare > price && (
                        <span className={`text-xs line-through ${muted}`}>
                          ₹{compare.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    {p.offer_text && (
                      <p className={`text-[10px] ${muted}`}>{p.offer_text}</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Custom CTA */}
      <section id="custom" className={`border-y ${border} py-14`}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black uppercase leading-tight">
            Bring your own art
          </h2>
          <p className={`mt-3 max-w-lg mx-auto text-sm ${muted}`}>
            Upload your design. We handle the DTF print — film, press, finish. Small batches, no
            minimum drama.
          </p>
          <Link
            href="/#contact"
            className="inline-block mt-6 bg-[#e2a233] text-black px-8 py-3 text-xs font-mono uppercase font-semibold"
          >
            Start your design
          </Link>
        </div>
      </section>

      {/* DTF Process */}
      <section id="process" className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-black uppercase mb-8">The Artbit process</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              n: '01',
              t: 'Prepare the design',
              d: 'We receive your artwork, check resolution & colours, and set it up for DTF transfer.'
            },
            {
              n: '02',
              t: 'Print the film',
              d: 'Design is printed onto DTF film with white ink underbase — ready for heat transfer.'
            },
            {
              n: '03',
              t: 'Press & finish',
              d: 'Film is pressed onto the garment, peeled, and finished. Ready to wear.'
            }
          ].map((step) => (
            <div key={step.n} className={`border p-5 ${border}`}>
              <p className="text-xs font-mono text-[#2c6660] mb-2">{step.n}</p>
              <h3 className="font-black uppercase text-sm mb-2">{step.t}</h3>
              <p className={`text-sm leading-relaxed ${muted}`}>{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className={`border-t ${border} py-12`}>
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div>
            <p className="font-black uppercase text-lg">Artbit</p>
            <p className={`text-sm mt-2 max-w-[28ch] ${muted}`}>
              A small DTF print house making apparel worth keeping. Printed to order, batch by
              batch.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase mb-3">Shop</p>
            <ul className={`space-y-1 text-sm ${muted}`}>
              <li>
                <Link href="/#shop">Tees</Link>
              </li>
              <li>
                <Link href="/#shop">Hoodies</Link>
              </li>
              <li>
                <Link href="/#shop">Kids</Link>
              </li>
              <li>
                <Link href="/#custom">Custom prints</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-mono uppercase mb-3">Studio</p>
            <ul className={`space-y-1 text-sm ${muted}`}>
              <li>
                <Link href="/#process">Our process</Link>
              </li>
              <li>
                <Link href="/about">About us</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy policy</Link>
              </li>
              <li>
                <Link href="/terms">Terms</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-mono uppercase mb-3">Follow</p>
            <ul className={`space-y-1 text-sm ${muted}`}>
              <li>
                <a
                  href="https://www.instagram.com/artbit.co.in?igsi=ZHJyNXFhb2VwY2xr"
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/share/19Eop63Sz3/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a href="mailto:artbit.hq@gmail.com">Email us</a>
              </li>
            </ul>
          </div>
        </div>
        <div
          className={`max-w-6xl mx-auto px-4 mt-10 pt-6 border-t ${border} flex flex-wrap justify-between gap-2 text-[11px] font-mono ${muted}`}
        >
          <span>© 2026 Artbit. All rights reserved.</span>
          <span>Printed with care.</span>
        </div>
      </footer>
    </div>
  )
}