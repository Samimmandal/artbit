'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function parseSizes(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((s) => String(s).replace(/["'\[\]]/g, '').trim())
      .filter(Boolean)
  }
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      if (Array.isArray(p)) {
        return p
          .map((s) => String(s).replace(/["'\[\]]/g, '').trim())
          .filter(Boolean)
      }
    } catch {}
    return raw
      .replace(/[\[\]"]/g, '')
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

function formatSizes(raw) {
  return parseSizes(raw).join(',')
}

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [artImage, setArtImage] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [wishCount, setWishCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const theme = localStorage.getItem('theme')
    if (theme === 'dark') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }

    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    const wish = JSON.parse(localStorage.getItem('wishlist') || '[]')
    setCartCount(cart.length)
    setWishCount(wish.length)

    async function load() {
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: false })

      setProducts(prods || [])

      const { data: art } = await supabase
        .from('homepage_art')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (art?.image_url) setArtImage(art.image_url)
      setLoading(false)
    }
    load()
  }, [])

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <div className={darkMode ? 'dark bg-black text-white min-h-screen' : 'bg-[#f2ede1] text-[#1b1b18] min-h-screen'}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-black/10 dark:border-white/10 bg-[#f2ede1]/90 dark:bg-black/90 backdrop-blur">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-7 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src={darkMode ? '/logo-white.png' : '/logo.png'}
              alt="Artbit"
              className="h-8 w-auto"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <span className="font-black uppercase tracking-tight text-lg hidden sm:inline">Artbit</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/#featured">Shop</Link>
            <Link href="/#custom">Custom Prints</Link>
            <Link href="/#process">Process</Link>
            <Link href="/#contact">Contact</Link>
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/wishlist" className="relative p-1" title="Wishlist">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
              </svg>
              {wishCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#bd4632] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {wishCount}
                </span>
              )}
            </Link>

            <Link href="/cart" className="relative p-1" title="Cart">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#bd4632] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link href="/orders" className="p-1" title="My Orders">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </Link>

            <Link href="/profile" className="p-1" title="Profile">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>

            <button onClick={toggleTheme} className="p-1" title="Theme">
              {darkMode ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-[1180px] mx-auto px-4 sm:px-7 pt-12 pb-10">
        <p className="text-xs uppercase tracking-[0.2em] mb-3 opacity-70">Small-batch DTF print house</p>
        <h1 className="font-black uppercase leading-[0.9] text-4xl sm:text-6xl md:text-7xl max-w-[16ch]">
          Printed by<br />Hand, Worn<br />On Purpose.
        </h1>
        <p className="mt-5 max-w-[42ch] text-sm sm:text-base opacity-80">
          Every tee, hoodie and tote is finished with Direct-to-Film transfer — full-colour detail, soft hand-feel, printed to order in small batches.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#featured" className="px-6 py-3 bg-[#1b1b18] text-[#f2ede1] dark:bg-white dark:text-black font-semibold text-sm uppercase tracking-wide">
            Shop Prints
          </a>
          <a href="#custom" className="px-6 py-3 border border-current font-semibold text-sm uppercase tracking-wide">
            Start Your Design
          </a>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section id="featured" className="max-w-[1180px] mx-auto px-4 sm:px-7 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-60 mb-1">On press this week</p>
            <h2 className="font-black uppercase text-2xl sm:text-3xl">Featured Prints</h2>
          </div>
          <Link href="/shop" className="text-sm underline opacity-70 hover:opacity-100">
            View full catalog →
          </Link>
        </div>

        {loading ? (
          <p className="opacity-60">Loading...</p>
        ) : products.length === 0 ? (
          <p className="opacity-60">No products yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.id}`}
                className="group border border-black/10 dark:border-white/10 overflow-hidden hover:shadow-lg transition"
              >
                <div className="aspect-[4/5] bg-black/5 dark:bg-white/5 overflow-hidden">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-40 text-sm">No image</div>
                  )}
                </div>
                <div className="p-4">
                  {p.tag && (
                    <span className="text-[10px] uppercase tracking-wider bg-[#e2a233]/30 px-2 py-0.5 rounded">
                      {p.tag}
                    </span>
                  )}
                  <h3 className="font-bold mt-1 text-base leading-tight">{p.name}</h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-semibold">₹{p.price}</span>
                    {p.compare_at_price && p.compare_at_price > p.price && (
                      <span className="text-sm line-through opacity-50">₹{p.compare_at_price}</span>
                    )}
                  </div>
                  {p.offer_text && (
                    <p className="text-xs mt-1 text-[#bd4632]">{p.offer_text}</p>
                  )}
                  <p className="text-xs mt-2 opacity-60">{formatSizes(p.sizes)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* YOUR ART HERE */}
      <section id="custom" className="max-w-[1180px] mx-auto px-4 sm:px-7 py-14">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-60 mb-2">Bring your own art</p>
            <h2 className="font-black uppercase text-3xl sm:text-4xl leading-none mb-4">
              Design It.<br />We&apos;ll Print It.
            </h2>
            <p className="opacity-80 text-sm sm:text-base max-w-[40ch]">
              Upload your artwork or share an idea — we&apos;ll handle the DTF film, powder and heat press, and send a sample before the full run ships.
            </p>
            <a
              href="#contact"
              className="inline-block mt-6 px-6 py-3 bg-[#2c6660] text-white font-semibold text-sm uppercase tracking-wide"
            >
              Start Your Design
            </a>
          </div>
          <div className="aspect-[4/3] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 overflow-hidden flex items-center justify-center">
            {artImage ? (
              <img src={artImage} alt="Your Art" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm opacity-50 uppercase tracking-widest">Your Art Here</span>
            )}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" className="max-w-[1180px] mx-auto px-4 sm:px-7 py-14 border-t border-black/10 dark:border-white/10">
        <p className="text-xs uppercase tracking-[0.2em] opacity-60 mb-2">How a print gets made</p>
        <h2 className="font-black uppercase text-2xl sm:text-3xl mb-10">The Artbit Process</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          <div>
            <p className="font-mono text-sm opacity-50 mb-2">01 / Film</p>
            <h3 className="font-bold text-lg mb-2">Print on film</h3>
            <p className="text-sm opacity-80">
              Your design is printed in full colour onto a PET film using DTF inks — sharp detail, soft hand-feel ready from the first pass.
            </p>
          </div>
          <div>
            <p className="font-mono text-sm opacity-50 mb-2">02 / Powder</p>
            <h3 className="font-bold text-lg mb-2">Powder & cure</h3>
            <p className="text-sm opacity-80">
              Hot-melt adhesive powder is applied to the wet ink, then cured so the transfer is stable, stretch-friendly and ready for the press.
            </p>
          </div>
          <div>
            <p className="font-mono text-sm opacity-50 mb-2">03 / Press</p>
            <h3 className="font-bold text-lg mb-2">Heat press & finish</h3>
            <p className="text-sm opacity-80">
              The film is heat-pressed onto the garment, peeled, and checked by hand. Every piece leaves only after a final quality pass.
            </p>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="max-w-[1180px] mx-auto px-4 sm:px-7 py-14 border-t border-black/10 dark:border-white/10">
        <p className="text-xs uppercase tracking-[0.2em] opacity-60 mb-2">Let&apos;s talk prints</p>
        <h2 className="font-black uppercase text-2xl sm:text-3xl mb-4">Have a Custom Order in Mind?</h2>
        <p className="opacity-80 text-sm max-w-[50ch] mb-6">
          Tell us about the run — quantity, garment, deadline — and we&apos;ll get back with a quote within one business day.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="https://www.instagram.com/artbit.co.in?igsh=ZHJyNXFhb2VwY2xr"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 border border-current text-sm font-medium"
          >
            Instagram
          </a>
          <a
            href="https://www.facebook.com/share/19Eop63Sz3/"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 border border-current text-sm font-medium"
          >
            Facebook
          </a>
          <a
            href="mailto:artbit.hq@gmail.com"
            className="px-5 py-2.5 border border-current text-sm font-medium"
          >
            Email
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/10 dark:border-white/10 mt-8">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-7 py-10 grid sm:grid-cols-4 gap-8 text-sm">
          <div>
            <p className="font-black uppercase mb-2">Artbit</p>
            <p className="opacity-70 text-xs max-w-[28ch]">
              A small DTF print studio making apparel worth keeping. Printed to order, batch by batch.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-2">Shop</p>
            <ul className="space-y-1 opacity-70">
              <li><Link href="/#featured">Tees</Link></li>
              <li><Link href="/#featured">Hoodies</Link></li>
              <li><Link href="/#custom">Custom Prints</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Studio</p>
            <ul className="space-y-1 opacity-70">
              <li><Link href="/#process">Our Process</Link></li>
              <li><Link href="/#contact">Contact</Link></li>
              <li><Link href="/orders">Track Order</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Info</p>
            <ul className="space-y-1 opacity-70">
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/terms">Terms & Conditions</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/hiring">We Are Hiring</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1180px] mx-auto px-4 sm:px-7 py-4 border-t border-black/10 dark:border-white/10 flex flex-wrap justify-between gap-2 text-xs opacity-60">
          <span>© 2026 Artbit Print Co. All rights reserved.</span>
          <span>Design concept, built with care.</span>
        </div>
      </footer>
    </div>
  )
}