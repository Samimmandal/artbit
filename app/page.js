'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(false)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [homeArt, setHomeArt] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('artbit-theme')
    if (saved === 'dark') setDarkMode(true)
    loadData()
  }, [])

  const loadData = async () => {
    const [{ data: prods }, { data: art }] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('homepage_art')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ])
    setProducts(prods || [])
    setHomeArt(art)
    setLoading(false)
  }

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('artbit-theme', next ? 'dark' : 'light')
  }

  const bg = darkMode ? 'bg-[#000000]' : 'bg-[#f2ede1]'
  const text = darkMode ? 'text-[#ffffff]' : 'text-[#000000]'
  const muted = darkMode ? 'text-[#cccccc]' : 'text-[#333333]'
  const card = darkMode ? 'bg-[#0a0a0a] border-[#ffffff]/15' : 'bg-white border-[#000000]/10'
  const border = darkMode ? 'border-[#ffffff]/20' : 'border-[#000000]/15'
  const imgBg = darkMode ? 'bg-[#111111]' : 'bg-[#e9e1d1]'
  const iconCls = `p-1.5 transition opacity-90 hover:opacity-100 ${
    darkMode ? 'hover:text-[#e2a233]' : 'hover:text-[#2c6660]'
  }`

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      {/* Header */}
      <header className={`border-b ${border} sticky top-0 ${bg} z-50`}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <Link href="/" className="shrink-0 flex items-center">
            <img
              src={darkMode ? '/logo-white.png' : '/logo.png'}
              alt="Artbit"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>

          <nav className={`hidden md:flex items-center gap-6 text-xs font-mono uppercase tracking-wider ${muted}`}>
            <Link href="/shop" className="hover:opacity-100 opacity-80 transition">Shop</Link>
            <a href="#prints" className="hover:opacity-100 opacity-80 transition">Prints</a>
            <a href="#process" className="hover:opacity-100 opacity-80 transition">Process</a>
            <a href="#contact" className="hover:opacity-100 opacity-80 transition">Contact</a>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/wishlist" className={iconCls} aria-label="Wishlist" title="Wishlist">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </Link>
            <Link href="/cart" className={iconCls} aria-label="Cart" title="Cart">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            </Link>
            <Link href="/account" className={iconCls} aria-label="Account" title="Account">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </Link>
            <Link href="/account" className={iconCls} aria-label="My Orders" title="My Orders">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </Link>
            <button onClick={toggleTheme} className={iconCls} aria-label="Theme" title={darkMode ? 'Light' : 'Dark'}>
              {darkMode ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 sm:px-6 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <p className={`text-xs font-mono uppercase tracking-widest mb-4 ${muted}`}>
              Small batch · DTF print house
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase leading-[0.95] tracking-tight mb-5">
              Design it.<br />We&apos;ll press it.
            </h1>
            <p className={`text-sm sm:text-base leading-relaxed max-w-md mb-8 ${muted}`}>
              Custom apparel printed to order. Tees, hoodies, oversized fits and kids — made with care, batch by batch.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="bg-[#000000] text-[#ffffff] px-6 py-3.5 font-mono text-xs uppercase tracking-wider"
              >
                Shop all prints
              </Link>
              <a
                href="#process"
                className={`border px-6 py-3.5 font-mono text-xs uppercase tracking-wider ${
                  darkMode ? 'border-[#ffffff]/40' : 'border-[#000000]'
                }`}
              >
                Our process
              </a>
            </div>
          </div>

          {/* YOUR ART — admin থেকে আপলোড */}
          <div className="aspect-square w-full max-w-md mx-auto overflow-hidden relative">
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
                    'repeating-linear-gradient(-45deg, #e9e1d1, #e9e1d1 8px, #ddd5c5 8px, #ddd5c5 16px)'
                }}
              >
                <span className="bg-[#f2ede1]/90 text-[#1b1b18] text-[10px] font-mono uppercase tracking-wider px-3 py-1.5">
                  Your Art Here
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Category strip */}
      <section className={`border-y ${border}`}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-4 flex flex-wrap justify-center gap-4 sm:gap-8 text-xs font-mono uppercase tracking-wider">
          {['Tees', 'Hoodies', 'Oversized', 'Kids', 'Custom'].map((c) => (
            <Link key={c} href="/shop" className={`${muted} hover:opacity-100 transition`}>
              {c}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section id="prints" className="max-w-6xl mx-auto px-5 sm:px-6 py-14 md:py-16">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <p className={`text-xs font-mono uppercase tracking-widest mb-2 ${muted}`}>Collection</p>
            <h2 className="text-2xl sm:text-3xl font-black uppercase">Featured prints</h2>
          </div>
          <Link href="/shop" className={`text-xs font-mono uppercase underline ${muted}`}>
            View all →
          </Link>
        </div>

        {loading ? (
          <p className="font-mono text-sm">Loading...</p>
        ) : products.length === 0 ? (
          <p className={`${muted} text-sm`}>No products yet. Add some from admin.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {products.map((p) => {
              const price = Number(p.price || 0)
              const compare = p.compare_at_price ? Number(p.compare_at_price) : null
              const off =
                compare && compare > price
                  ? Math.round(((compare - price) / compare) * 100)
                  : null
              return (
                <Link
                  key={p.id}
                  href={`/product/${p.id}`}
                  className={`${card} border overflow-hidden group`}
                >
                  <div className={`aspect-[3/4] ${imgBg} relative overflow-hidden`}>
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs opacity-40">
                        No image
                      </div>
                    )}
                    {p.tag && (
                      <span className="absolute top-2 left-2 bg-[#000000] text-[#ffffff] text-[9px] font-mono uppercase px-1.5 py-0.5">
                        {p.tag}
                      </span>
                    )}
                    {off && (
                      <span className="absolute top-2 right-2 bg-[#bd4632] text-white text-[9px] font-mono uppercase px-1.5 py-0.5">
                        {off}% OFF
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm uppercase truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-mono text-sm text-[#2c6660] font-bold">
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      {compare && compare > price && (
                        <span className={`font-mono text-xs line-through ${muted}`}>
                          ₹{compare.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    {p.offer_text && (
                      <p className="text-[10px] font-mono uppercase text-[#bd4632] mt-1">
                        {p.offer_text}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* DTF Process */}
      <section id="process" className={`border-t ${border}`}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-14 md:py-16">
          <p className={`text-xs font-mono uppercase tracking-widest mb-2 ${muted}`}>
            How it works
          </p>
          <h2 className="text-2xl sm:text-3xl font-black uppercase mb-10">
            The Artbit process
          </h2>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                n: '01',
                title: 'Prepare the design',
                desc: 'Your artwork is colour-corrected and sized for Direct-to-Film transfer — sharp edges, true colours.'
              },
              {
                n: '02',
                title: 'Print the film',
                desc: 'We print your design onto specialised PET film with DTF ink, then apply hot-melt powder for a strong bond.'
              },
              {
                n: '03',
                title: 'Press & finish',
                desc: 'Heat-pressed onto premium blanks, cooled and checked. Ready to wear, wash after wash.'
              }
            ].map((step) => (
              <div key={step.n} className={`${card} border p-6`}>
                <p className="font-mono text-xs text-[#2c6660] mb-3">{step.n}</p>
                <h3 className="font-black uppercase text-lg mb-2">{step.title}</h3>
                <p className={`text-sm leading-relaxed ${muted}`}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={`border-t ${border}`}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-black uppercase mb-4">
            Ready to wear your art?
          </h2>
          <p className={`text-sm max-w-md mx-auto mb-6 ${muted}`}>
            Browse the shop or drop us a message for custom bulk orders.
          </p>
          <Link
            href="/shop"
            className="inline-block bg-[#2c6660] text-white px-8 py-3.5 font-mono text-xs uppercase tracking-wider"
          >
            Shop now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className={`border-t ${border}`}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <img
                src={darkMode ? '/logo-white.png' : '/logo.png'}
                alt="Artbit"
                className="h-8 w-auto object-contain mb-3"
              />
              <p className={`text-xs leading-relaxed max-w-[28ch] ${muted}`}>
                Small DTF print studio making apparel worth keeping. Printed to order, batch by batch.
              </p>
            </div>
            <div>
              <h5 className="text-xs font-mono uppercase font-semibold mb-3">Shop</h5>
              <ul className={`space-y-2 text-sm ${muted}`}>
                <li><Link href="/shop" className="hover:opacity-100">Tees</Link></li>
                <li><Link href="/shop" className="hover:opacity-100">Hoodies</Link></li>
                <li><Link href="/shop" className="hover:opacity-100">Kids</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-mono uppercase font-semibold mb-3">Studio</h5>
              <ul className={`space-y-2 text-sm ${muted}`}>
                <li><a href="#process" className="hover:opacity-100">Our Process</a></li>
                <li><Link href="/page/about" className="hover:opacity-100">About Us</Link></li>
                <li><Link href="/page/terms" className="hover:opacity-100">Terms</Link></li>
                <li><Link href="/page/privacy" className="hover:opacity-100">Privacy</Link></li>
                <li><Link href="/page/hiring" className="hover:opacity-100">We&apos;re Hiring</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-mono uppercase font-semibold mb-3">Follow</h5>
              <div className="flex gap-3">
                <a
                  href="https://www.instagram.com/artbit.co.in?igsh=ZHJyNXFhb2VwY2xr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={iconCls}
                  aria-label="Instagram"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
                <a
                  href="https://www.facebook.com/share/19Eop63Sz3/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={iconCls}
                  aria-label="Facebook"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                <a
                  href="mailto:artbit.hq@gmail.com"
                  className={iconCls}
                  aria-label="Email"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className={`border-t ${border} pt-6 flex flex-col sm:flex-row justify-between gap-2 text-[11px] font-mono ${muted}`}>
            <span>© 2026 Artbit. All rights reserved.</span>
            <span>Printed with care.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}