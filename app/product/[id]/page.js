'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

function parseImages(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      if (Array.isArray(p)) return p.filter(Boolean)
    } catch {}
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

export default function ProductPage() {
  const { id } = useParams()
  const router = useRouter()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState('')
  const [activeImg, setActiveImg] = useState(0)
  const [darkMode, setDarkMode] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [wishCount, setWishCount] = useState(0)
  const [msg, setMsg] = useState('')

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
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      setProduct(data)
      setLoading(false)
    }
    if (id) load()
  }, [id])

  const sizes = useMemo(() => parseSizes(product?.sizes), [product])
  const gallery = useMemo(() => {
    if (!product) return []
    const list = []
    if (product.image_url) list.push(product.image_url)
    parseImages(product.images).forEach((u) => {
      if (u && !list.includes(u)) list.push(u)
    })
    return list
  }, [product])

  useEffect(() => {
    if (sizes.length && !selectedSize) setSelectedSize(sizes[0])
  }, [sizes, selectedSize])

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  const addToCart = () => {
    if (!product) return
    if (!selectedSize) {
      setMsg('Please select a size')
      return
    }
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      size: selectedSize,
      qty: 1,
    })
    localStorage.setItem('cart', JSON.stringify(cart))
    setCartCount(cart.length)
    setMsg('Added to cart')
    setTimeout(() => setMsg(''), 2000)
  }

  const addToWishlist = () => {
    if (!product) return
    const wish = JSON.parse(localStorage.getItem('wishlist') || '[]')
    if (wish.find((w) => w.id === product.id)) {
      setMsg('Already in wishlist')
      setTimeout(() => setMsg(''), 2000)
      return
    }
    wish.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
    })
    localStorage.setItem('wishlist', JSON.stringify(wish))
    setWishCount(wish.length)
    setMsg('Added to wishlist')
    setTimeout(() => setMsg(''), 2000)
  }

  const buyNow = () => {
    addToCart()
    router.push('/checkout')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2ede1] dark:bg-black">
        Loading...
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f2ede1] dark:bg-black">
        <p>Product not found</p>
        <Link href="/" className="underline">Back to home</Link>
      </div>
    )
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

      <div className="max-w-[1180px] mx-auto px-4 sm:px-7 py-8">
        <Link href="/" className="text-sm opacity-60 hover:opacity-100 mb-6 inline-block">
          ← Back to shop
        </Link>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* GALLERY */}
          <div>
            <div className="aspect-[4/5] bg-black/5 dark:bg-white/5 overflow-hidden border border-black/10 dark:border-white/10">
              {gallery.length > 0 ? (
                <img
                  src={gallery[activeImg]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-40">No image</div>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {gallery.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={`w-16 h-20 flex-shrink-0 border-2 overflow-hidden ${
                      activeImg === i ? 'border-[#bd4632]' : 'border-transparent opacity-70'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div>
            {product.tag && (
              <span className="text-[10px] uppercase tracking-wider bg-[#e2a233]/30 px-2 py-0.5 rounded">
                {product.tag}
              </span>
            )}
            <h1 className="font-black uppercase text-2xl sm:text-3xl mt-2 leading-tight">
              {product.name}
            </h1>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-2xl font-bold">₹{product.price}</span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <>
                  <span className="text-lg line-through opacity-50">₹{product.compare_at_price}</span>
                  <span className="text-sm text-[#bd4632] font-medium">
                    {Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}% OFF
                  </span>
                </>
              )}
            </div>

            {product.offer_text && (
              <p className="text-sm mt-2 text-[#bd4632]">{product.offer_text}</p>
            )}

            {product.description && (
              <p className="mt-4 text-sm opacity-80 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            )}

            {/* SIZES */}
            <div className="mt-6">
              <p className="text-xs uppercase tracking-wider opacity-60 mb-2">
                Size: {formatSizes(product.sizes)}
              </p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[48px] h-10 px-3 border text-sm font-medium transition ${
                      selectedSize === size
                        ? 'bg-[#1b1b18] text-[#f2ede1] dark:bg-white dark:text-black border-transparent'
                        : 'border-current hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {product.stock != null && (
              <p className="mt-3 text-xs opacity-60">{product.stock} in stock</p>
            )}

            {/* ACTIONS */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addToCart}
                className="flex-1 min-w-[140px] px-6 py-3 border border-current font-semibold text-sm uppercase tracking-wide"
              >
                Add to Cart
              </button>
              <button
                type="button"
                onClick={buyNow}
                className="flex-1 min-w-[140px] px-6 py-3 bg-[#1b1b18] text-[#f2ede1] dark:bg-white dark:text-black font-semibold text-sm uppercase tracking-wide"
              >
                Buy Now
              </button>
              <button
                type="button"
                onClick={addToWishlist}
                className="px-4 py-3 border border-current"
                title="Wishlist"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
                </svg>
              </button>
            </div>

            {msg && (
              <p className="mt-3 text-sm text-[#2c6660] dark:text-[#e2a233]">{msg}</p>
            )}

            {/* TRUST */}
            <div className="mt-8 grid grid-cols-3 gap-3 text-center text-[11px] opacity-70">
              <div className="border border-black/10 dark:border-white/10 p-3">
                100% Genuine
              </div>
              <div className="border border-black/10 dark:border-white/10 p-3">
                Secure Payment
              </div>
              <div className="border border-black/10 dark:border-white/10 p-3">
                7 Day Return
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}