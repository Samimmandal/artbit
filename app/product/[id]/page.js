'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

function parseSizes(raw) {
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
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

function parseImages(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      if (Array.isArray(p)) return p.filter(Boolean)
    } catch {}
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
  const [darkMode, setDarkMode] = useState(true)
  const [pincode, setPincode] = useState('')
  const [pinMsg, setPinMsg] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const t = localStorage.getItem('artbit-theme')
    if (t === 'light') setDarkMode(false)
  }, [])

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) console.error(error)
      setProduct(data || null)
      setLoading(false)
    })()
  }, [id])

  const sizes = useMemo(() => parseSizes(product?.sizes), [product])

  // Main photo FIRST, then extra photos
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
    setActiveImg(0)
    if (sizes.length) setSelectedSize(sizes[0])
  }, [product, sizes])

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('artbit-theme', next ? 'dark' : 'light')
  }

  const showToast = (text) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 2000)
  }

  const addToCart = () => {
    if (!selectedSize) {
      showToast('Select a size')
      return
    }
    const cart = JSON.parse(localStorage.getItem('artbit-cart') || '[]')
    const existing = cart.find((i) => i.id === product.id && i.size === selectedSize)
    if (existing) existing.qty = (existing.qty || 1) + 1
    else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        size: selectedSize,
        qty: 1
      })
    }
    localStorage.setItem('artbit-cart', JSON.stringify(cart))
    showToast('Added to cart')
  }

  const addToWishlist = () => {
    const list = JSON.parse(localStorage.getItem('artbit-wishlist') || '[]')
    if (!list.find((i) => i.id === product.id)) {
      list.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url
      })
      localStorage.setItem('artbit-wishlist', JSON.stringify(list))
    }
    showToast('Added to wishlist')
  }

  const buyNow = () => {
    if (!selectedSize) {
      showToast('Select a size')
      return
    }
    localStorage.setItem(
      'artbit-cart',
      JSON.stringify([
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          size: selectedSize,
          qty: 1
        }
      ])
    )
    router.push('/checkout')
  }

  const checkPin = () => {
    if (!/^\d{6}$/.test(pincode)) {
      setPinMsg('Enter valid 6-digit pincode')
      return
    }
    setPinMsg('Delivery available. Usually 4–7 days.')
  }

  const bg = darkMode ? 'bg-black text-white' : 'bg-[#f2ede1] text-black'
  const muted = darkMode ? 'text-white/55' : 'text-black/55'
  const border = darkMode ? 'border-white/15' : 'border-black/15'
  const btnGhost = darkMode ? 'border-white/25' : 'border-black/25'

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center font-mono text-sm`}>
        Loading...
      </div>
    )
  }

  if (!product) {
    return (
      <div className={`min-h-screen ${bg} flex flex-col items-center justify-center gap-3`}>
        <p className="font-mono text-sm">Product not found</p>
        <Link href="/" className="underline text-sm">
          Back home
        </Link>
      </div>
    )
  }

  const price = Number(product.price) || 0
  const compare = product.compare_at_price ? Number(product.compare_at_price) : null
  const discount =
    compare && compare > price ? Math.round(((compare - price) / compare) * 100) : null

  return (
    <div className={`min-h-screen ${bg}`}>
      <header className={`border-b ${border} px-4 py-3 flex items-center justify-between`}>
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
        <div className="flex items-center gap-4 text-base">
          <Link href="/wishlist" title="Wishlist">
            ♡
          </Link>
          <Link href="/cart" title="Cart">
            🛒
          </Link>
          <Link href="/account" title="Orders">
            👜
          </Link>
          <button type="button" onClick={toggleTheme} title="Theme">
            {darkMode ? '☀' : '☾'}
          </button>
        </div>
      </header>

      {msg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#2c6660] text-white text-xs font-mono px-4 py-2 rounded">
          {msg}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-2 gap-8">
        {/* Gallery — main image first */}
        <div>
          <div className={`relative aspect-[4/5] border ${border} overflow-hidden bg-black/5`}>
            {product.tag && (
              <span className="absolute top-2 left-2 z-10 bg-black text-white text-[9px] font-mono uppercase px-2 py-1">
                {product.tag}
              </span>
            )}
            {discount != null && (
              <span className="absolute top-2 right-2 z-10 bg-[#bd4632] text-white text-[9px] font-mono uppercase px-2 py-1">
                {discount}% OFF
              </span>
            )}
            {gallery[activeImg] ? (
              <img
                src={gallery[activeImg]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm opacity-40">
                No image
              </div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {gallery.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-16 h-20 border overflow-hidden ${
                    i === activeImg ? 'border-[#2c6660]' : border
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {product.category && (
            <p className={`text-[10px] font-mono uppercase tracking-widest ${muted}`}>
              {product.category}
            </p>
          )}
          <h1 className="text-2xl md:text-3xl font-black uppercase leading-tight">
            {product.name}
          </h1>

          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-xl font-semibold">₹{price.toLocaleString('en-IN')}</span>
            {compare && compare > price && (
              <>
                <span className={`line-through text-sm ${muted}`}>
                  ₹{compare.toLocaleString('en-IN')}
                </span>
                {discount != null && (
                  <span className="text-xs font-mono text-[#2c6660]">{discount}% off</span>
                )}
              </>
            )}
          </div>
          <p className={`text-[11px] ${muted}`}>Inclusive of all taxes</p>
          {product.offer_text && (
            <p className="text-xs font-mono text-[#bd4632] uppercase">{product.offer_text}</p>
          )}

          {product.description && (
            <p className={`text-sm leading-relaxed ${muted}`}>{product.description}</p>
          )}

          {/* Sizes — clean, NO quotes, NO brackets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-xs font-mono uppercase ${muted}`}>
                Size{selectedSize ? `: ${selectedSize}` : ''}
              </p>
              <button
                type="button"
                className={`text-[11px] underline ${muted}`}
                onClick={() =>
                  alert(
                    'Size guide: S 36–38 | M 38–40 | L 40–42 | XL 42–44 | XXL 44–46 (chest in inches)'
                  )
                }
              >
                Size Guide
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.length === 0 && (
                <span className={`text-xs ${muted}`}>No sizes available</span>
              )}
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  className={`min-w-[48px] px-3 py-2 text-xs font-mono uppercase border ${
                    selectedSize === s
                      ? 'bg-[#2c6660] border-[#2c6660] text-white'
                      : btnGhost
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className={`text-xs mt-2 ${muted}`}>
              {product.stock != null ? `${product.stock} in stock` : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={buyNow}
              className="flex-1 min-w-[110px] bg-[#2c6660] text-white py-3 text-xs font-mono uppercase"
            >
              Buy Now
            </button>
            <button
              type="button"
              onClick={addToCart}
              className={`flex-1 min-w-[110px] border py-3 text-xs font-mono uppercase ${btnGhost}`}
            >
              Add to Cart
            </button>
            <button
              type="button"
              onClick={addToWishlist}
              className={`px-4 border py-3 text-xs font-mono uppercase ${btnGhost}`}
            >
              Wishlist
            </button>
          </div>

          <div className={`border p-3 ${border}`}>
            <p className="text-[10px] font-mono uppercase mb-1">Available coupons</p>
            <p className="text-xs text-[#2c6660] font-mono">ARTBIT10 · 10% off</p>
          </div>

          <div>
            <p className={`text-[10px] font-mono uppercase mb-2 ${muted}`}>Delivery</p>
            <div className="flex gap-2">
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter pincode"
                className={`flex-1 border px-3 py-2 text-sm bg-transparent ${border}`}
              />
              <button
                type="button"
                onClick={checkPin}
                className="bg-[#2c6660] text-white px-4 text-xs font-mono uppercase"
              >
                Check
              </button>
            </div>
            {pinMsg && <p className={`text-xs mt-2 ${muted}`}>{pinMsg}</p>}
          </div>

          <div className={`border p-3 ${border}`}>
            <p className="text-xs font-semibold uppercase">7 Day Return & Exchange →</p>
            <p className={`text-[11px] mt-1 ${muted}`}>
              Easy returns up to 7 days of delivery. Click to read full policy.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className={`border p-2 ${border}`}>
              <p className="text-[10px] font-mono uppercase">100%</p>
              <p className={`text-[10px] ${muted}`}>Genuine product</p>
            </div>
            <div className={`border p-2 ${border}`}>
              <p className="text-[10px] font-mono uppercase">100%</p>
              <p className={`text-[10px] ${muted}`}>Secure payment</p>
            </div>
            <div className={`border p-2 ${border}`}>
              <p className="text-[10px] font-mono uppercase">Easy</p>
              <p className={`text-[10px] ${muted}`}>Return & refund</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}