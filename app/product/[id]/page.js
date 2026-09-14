'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'

export default function ProductDetails() {
  const { id } = useParams()
  const router = useRouter()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedImage, setSelectedImage] = useState(0)
  const [orderForm, setOrderForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '', address: '', quantity: 1
  })
  const [reviews, setReviews] = useState([])
  const [reviewForm, setReviewForm] = useState({ reviewer_name: '', rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [user, setUser] = useState(null)
  const [cartLoading, setCartLoading] = useState(false)
  const [wishLoading, setWishLoading] = useState(false)
  const [coupons, setCoupons] = useState([])
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [pincode, setPincode] = useState('')
  const [pinMsg, setPinMsg] = useState('')
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [showReturnPolicy, setShowReturnPolicy] = useState(false)
  const [related, setRelated] = useState([])
  const [touchStart, setTouchStart] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('artbit-theme')
    if (saved === 'dark') setDarkMode(true)
    checkUser()
    if (id) {
      fetchProduct()
      fetchReviews()
      fetchCoupons()
    }
  }, [id])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      setOrderForm(f => ({
        ...f,
        customer_email: user.email || f.customer_email,
        customer_name: user.user_metadata?.full_name || user.user_metadata?.name || f.customer_name
      }))
    }
  }

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('artbit-theme', next ? 'dark' : 'light')
  }

  const fetchProduct = async () => {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
    if (error || !data) {
      setProduct(null)
    } else {
      setProduct(data)
      setSelectedImage(0)
      if (data.sizes) {
        const sizes = data.sizes.split(',').map(s => s.trim())
        setSelectedSize(sizes[0] || '')
      }
      if (data.colors) {
        const cols = data.colors.split(',').map(c => c.trim())
        setSelectedColor(cols[0] || '')
      }
      const { data: rel } = await supabase.from('products').select('*').neq('id', id).limit(4)
      setRelated(rel || [])
    }
    setLoading(false)
  }

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
    setReviews(data || [])
  }

  const fetchCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').eq('is_active', true).limit(5)
    setCoupons(data || [])
  }

  const requireLogin = () => {
    if (!user) {
      alert('Please login first')
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href }
      })
      return false
    }
    return true
  }

    const addToCart = async () => {
    if (!requireLogin()) return
    setCartLoading(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) {
      alert('Please login first')
      setCartLoading(false)
      return
    }
    const { error } = await supabase.from('cart').upsert({
      user_id: u.id,
      product_id: Number(id),
      quantity: 1,
      size: selectedSize || 'M'
    }, { onConflict: 'user_id,product_id,size' })
    if (error) {
      alert('Cart error: ' + error.message)
    } else {
      alert('Added to cart!')
    }
    setCartLoading(false)
  }

  const addToWishlist = async () => {
    if (!requireLogin()) return
    setWishLoading(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) {
      alert('Please login first')
      setWishLoading(false)
      return
    }
    const { error } = await supabase.from('wishlist').upsert({
      user_id: u.id,
      product_id: Number(id)
    }, { onConflict: 'user_id,product_id' })
    if (error) {
      alert('Wishlist error: ' + error.message)
    } else {
      alert('Added to wishlist!')
    }
    setWishLoading(false)
  }

  const checkPincode = () => {
    if (!pincode || pincode.length < 6) {
      setPinMsg('Enter a valid 6-digit pincode')
      return
    }
    setPinMsg('Delivery available · Est. 4–7 days · Shipping ₹49 (Free above ₹999)')
  }

  const applyCoupon = async () => {
    setCouponError('')
    if (!couponCode.trim()) {
      setCouponError('Enter a coupon code')
      return
    }
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase().trim())
      .eq('is_active', true)
      .single()
    if (error || !data) {
      setAppliedCoupon(null)
      setCouponError('Invalid or expired coupon')
      return
    }
    setAppliedCoupon(data)
    setCouponError('')
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponError('')
  }

  const calcTotals = () => {
    const price = Number(product?.price || 0)
    const qty = orderForm.quantity || 1
    const subtotal = price * qty
    let discount = 0
    if (appliedCoupon) {
      if (appliedCoupon.discount_percent) {
        discount = Math.round(subtotal * (appliedCoupon.discount_percent / 100))
      } else {
        discount = appliedCoupon.discount_amount || 0
      }
    }
    return { subtotal, discount, total: Math.max(0, subtotal - discount) }
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    setSubmittingReview(true)
    const { error } = await supabase.from('reviews').insert([{
      product_id: parseInt(id),
      reviewer_name: reviewForm.reviewer_name,
      rating: parseInt(reviewForm.rating),
      comment: reviewForm.comment,
      is_approved: true
    }])
    if (error) alert('Error: ' + error.message)
    else {
      setReviewForm({ reviewer_name: '', rating: 5, comment: '' })
      fetchReviews()
      alert('Review submitted!')
    }
    setSubmittingReview(false)
  }

  const loadRazorpayScript = () => new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

  const saveOrder = async (status, totalAmount, paymentMethod) => {
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        customer_name: orderForm.customer_name,
        customer_email: orderForm.customer_email,
        customer_phone: orderForm.customer_phone,
        address: orderForm.address,
        total_amount: totalAmount,
        status,
        payment_method: paymentMethod,
        user_id: user?.id || null,
        tracking_note: appliedCoupon ? `Coupon: ${appliedCoupon.code}` : null
      }])
      .select()
      .single()
    if (error) throw error
    await supabase.from('order_items').insert([{
      order_id: order.id,
      product_id: product.id,
      quantity: orderForm.quantity,
      price: product.price,
      size: selectedSize
    }])
    return order
  }

  const handlePayOnline = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const { total } = calcTotals()
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total })
      })
      const razorpayOrder = await res.json()
      if (!razorpayOrder.id) throw new Error(razorpayOrder.error || 'Failed')
      await loadRazorpayScript()
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || 'INR',
        name: 'Artbit',
        description: product.name,
        order_id: razorpayOrder.id,
        handler: async function () {
          try {
            await saveOrder('paid', total, 'online')
            alert('Payment successful! Order placed.')
            setShowOrderForm(false)
            router.push('/account')
          } catch (err) {
            alert('Order save failed: ' + err.message)
          }
        },
        prefill: {
          name: orderForm.customer_name,
          email: orderForm.customer_email,
          contact: orderForm.customer_phone
        },
        theme: { color: '#2c6660' }
      }
      new window.Razorpay(options).open()
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setSubmitting(false)
  }

  const handleCOD = async (e) => {
    e.preventDefault()
    if (!confirm('Place order with Cash on Delivery?')) return
    setSubmitting(true)
    const { total } = calcTotals()
    try {
      await saveOrder('cod', total, 'cod')
      alert('COD order placed! Pay when you receive the product.')
      setShowOrderForm(false)
      router.push('/account')
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setSubmitting(false)
  }

  const images = product
    ? (product.images?.length ? product.images.slice(0, 5) : (product.image_url ? [product.image_url] : []))
    : []

  const prevImage = () => {
    if (images.length < 2) return
    setSelectedImage(i => (i === 0 ? images.length - 1 : i - 1))
  }

  const nextImage = () => {
    if (images.length < 2) return
    setSelectedImage(i => (i === images.length - 1 ? 0 : i + 1))
  }

  const onTouchStart = (e) => setTouchStart(e.touches[0].clientX)
  const onTouchEnd = (e) => {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextImage()
      else prevImage()
    }
    setTouchStart(null)
  }

  const bg = darkMode ? 'bg-[#000000]' : 'bg-[#f2ede1]'
  const text = darkMode ? 'text-[#ffffff]' : 'text-[#000000]'
  const card = darkMode ? 'bg-[#0a0a0a] border-[#ffffff]/20' : 'bg-white border-[#000000]/15'
  const muted = darkMode ? 'text-[#cccccc]' : 'text-[#333333]'
  const imgBg = darkMode ? 'bg-[#111111]' : 'bg-[#e9e1d1]'
  const iconCls = `p-1.5 transition opacity-90 hover:opacity-100 ${
    darkMode ? 'hover:text-[#e2a233]' : 'hover:text-[#2c6660]'
  }`

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <p className={`font-mono text-sm ${text}`}>Loading...</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className={`min-h-screen ${bg} flex flex-col items-center justify-center gap-4`}>
        <p className={`font-mono ${text}`}>Product not found</p>
        <Link href="/shop" className="text-sm underline">← Back to Shop</Link>
      </div>
    )
  }

  const sizes = product.sizes ? product.sizes.split(',').map(s => s.trim()) : []
  const colors = product.colors ? product.colors.split(',').map(c => c.trim()) : []
  const price = Number(product.price)
  const compare = product.compare_at_price ? Number(product.compare_at_price) : null
  const discountPct = compare && compare > price ? Math.round(((compare - price) / compare) * 100) : null
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null
  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length
  }))
  const { subtotal, discount: orderDiscount, total: orderTotal } = calcTotals()

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      <header className={`border-b ${darkMode ? 'border-[#ffffff]/20' : 'border-[#000000]/15'} sticky top-0 ${bg} z-50`}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <Link href="/" className="shrink-0 flex items-center">
            <img
              src={darkMode ? '/logo-white.png' : '/logo.png'}
              alt="Artbit"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/wishlist" className={iconCls} aria-label="Wishlist" title="Wishlist">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </Link>
            <Link href="/cart" className={iconCls} aria-label="Cart" title="Cart">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
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

      <section className="max-w-6xl mx-auto px-5 sm:px-6 py-8 md:py-12">
        <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-start">
          <div>
            <div
              className={`relative aspect-[3/4] w-full overflow-hidden ${imgBg} border ${darkMode ? 'border-[#ffffff]/15' : 'border-[#000000]/10'}`}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {images[selectedImage] ? (
                <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-mono opacity-50">No image</div>
              )}
              {product.tag && (
                <span className="absolute top-3 left-3 bg-[#000000] text-[#ffffff] text-[10px] font-mono uppercase px-2 py-1 z-10">{product.tag}</span>
              )}
              {discountPct && (
                <span className="absolute top-3 right-3 bg-[#bd4632] text-white text-[10px] font-mono uppercase px-2 py-1 z-10">{discountPct}% OFF</span>
              )}
              {images.length > 1 && (
                <>
                  <button type="button" onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center text-lg z-10 hover:bg-black/60" aria-label="Previous">‹</button>
                  <button type="button" onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center text-lg z-10 hover:bg-black/60" aria-label="Next">›</button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(i)}
                      className={`shrink-0 w-16 h-20 overflow-hidden border-2 ${selectedImage === i ? 'border-[#2c6660]' : darkMode ? 'border-[#ffffff]/25' : 'border-gray-300'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <div className="flex justify-center gap-1.5 mt-3">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(i)}
                      className={`h-1.5 rounded-full transition ${selectedImage === i ? 'bg-[#2c6660] w-4' : darkMode ? 'bg-[#ffffff]/30 w-1.5' : 'bg-gray-400 w-1.5'}`}
                      aria-label={`Image ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            {product.category && <p className={`text-xs font-mono uppercase ${muted} mb-1`}>{product.category}</p>}
            <h1 className="text-2xl md:text-3xl font-black uppercase leading-tight mb-2">{product.name}</h1>
            {avgRating && <p className={`text-sm ${muted} mb-3`}>★ {avgRating} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>}
            <div className="flex items-baseline gap-3 mb-1 flex-wrap">
              <span className="font-mono text-2xl text-[#2c6660] font-bold">₹{price.toLocaleString('en-IN')}</span>
              {compare && compare > price && (
                <>
                  <span className={`font-mono text-base line-through ${muted}`}>₹{compare.toLocaleString('en-IN')}</span>
                  <span className="text-sm font-semibold text-[#bd4632]">{discountPct}% off</span>
                </>
              )}
            </div>
            <p className={`text-xs ${muted} mb-1`}>Inclusive of all taxes</p>
            {compare && compare > price && <p className="text-sm text-[#2c6660] mb-3">Get it for as low as ₹{price.toLocaleString('en-IN')}</p>}
            {product.offer_text && <p className="text-xs font-mono uppercase text-[#bd4632] mb-4">{product.offer_text}</p>}
            {product.fabric && <p className={`text-sm mb-4 ${muted}`}><span className="font-semibold text-current">Fabric:</span> {product.fabric}</p>}
            {product.description && <p className={`${muted} text-sm leading-relaxed mb-6`}>{product.description}</p>}

            {colors.length > 0 && (
              <div className="mb-5">
                <p className={`text-xs font-mono uppercase ${muted} mb-2`}>Color: {selectedColor}</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map(c => (
                    <button key={c} type="button" onClick={() => setSelectedColor(c)} className={`px-3 py-1.5 text-xs font-mono border uppercase ${selectedColor === c ? 'bg-[#000000] text-[#ffffff] border-[#000000]' : darkMode ? 'border-[#ffffff]/30' : 'border-[#000000]/30'}`}>{c}</button>
                  ))}
                </div>
              </div>
            )}

            {sizes.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-xs font-mono uppercase ${muted}`}>Size: {selectedSize}</p>
                  <button type="button" onClick={() => setShowSizeGuide(true)} className="text-xs underline font-mono">Size Guide</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => (
                    <button key={size} type="button" onClick={() => setSelectedSize(size)} className={`w-11 h-11 text-sm font-mono border transition ${selectedSize === size ? 'bg-[#000000] text-[#ffffff] border-[#000000]' : darkMode ? 'border-[#ffffff]/30' : 'border-[#000000]/30'}`}>{size}</button>
                  ))}
                </div>
              </div>
            )}

            <p className={`text-xs font-mono ${muted} mb-5`}>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>

            <div className="flex flex-wrap gap-2 mb-6">
              <button type="button" onClick={() => setShowOrderForm(true)} disabled={product.stock <= 0} className="flex-1 min-w-[120px] bg-[#000000] text-[#ffffff] py-3.5 font-mono text-xs uppercase tracking-wider disabled:opacity-40">Buy Now</button>
              <button type="button" onClick={addToCart} disabled={cartLoading || product.stock <= 0} className={`flex-1 min-w-[120px] border py-3.5 font-mono text-xs uppercase tracking-wider disabled:opacity-40 ${darkMode ? 'border-[#ffffff]/40' : 'border-[#000000]'}`}>{cartLoading ? '...' : 'Add to Cart'}</button>
              <button type="button" onClick={addToWishlist} disabled={wishLoading} className={`border px-4 py-3.5 font-mono text-xs uppercase disabled:opacity-40 ${darkMode ? 'border-[#ffffff]/40' : 'border-[#000000]'}`}>{wishLoading ? '...' : 'Wishlist'}</button>
            </div>

            {coupons.length > 0 && (
              <div className={`${card} border p-4 mb-5`}>
                <p className="text-xs font-mono uppercase mb-2 font-semibold">Available Coupons</p>
                {coupons.map(c => (
                  <div key={c.id} className={`text-sm py-1.5 border-b last:border-0 ${darkMode ? 'border-[#ffffff]/10' : 'border-gray-200'}`}>
                    <span className="font-mono font-bold text-[#2c6660]">{c.code}</span>
                    <span className={`ml-2 ${muted}`}>{c.description || (c.discount_percent ? `${c.discount_percent}% off` : `₹${c.discount_amount} off`)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className={`${card} border p-4 mb-5`}>
              <p className="text-xs font-mono uppercase mb-2 font-semibold">Delivery</p>
              <div className="flex gap-2">
                <input value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter pincode" className={`flex-1 border px-3 py-2 text-sm outline-none bg-transparent ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`} />
                <button type="button" onClick={checkPincode} className="bg-[#2c6660] text-white px-4 py-2 text-xs font-mono uppercase">Check</button>
              </div>
              {pinMsg && <p className={`text-xs mt-2 ${muted}`}>{pinMsg}</p>}
            </div>

            {(product.fit || product.neck || product.sleeve || product.hemline || product.design_note) && (
              <div className={`${card} border p-4 mb-5`}>
                <p className="text-xs font-mono uppercase mb-3 font-semibold">Product Highlights</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {product.design_note && <p><span className={muted}>Design:</span> {product.design_note}</p>}
                  {product.fit && <p><span className={muted}>Fit:</span> {product.fit}</p>}
                  {product.neck && <p><span className={muted}>Neck:</span> {product.neck}</p>}
                  {product.sleeve && <p><span className={muted}>Sleeve:</span> {product.sleeve}</p>}
                  {product.hemline && <p><span className={muted}>Hemline:</span> {product.hemline}</p>}
                </div>
              </div>
            )}

            <button type="button" onClick={() => setShowReturnPolicy(true)} className={`${card} border p-4 mb-5 w-full text-left hover:opacity-90 transition`}>
              <p className="text-xs font-mono uppercase font-semibold mb-1">7 Day Return & Exchange →</p>
              <p className={`text-xs ${muted}`}>Easy returns up to 7 days of delivery. Click to read full policy.</p>
            </button>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono uppercase mb-6">
              <div className={`${card} border p-3`}><p className="font-semibold mb-1">100%</p><p className={muted}>Genuine Product</p></div>
              <div className={`${card} border p-3`}><p className="font-semibold mb-1">100%</p><p className={muted}>Secure Payment</p></div>
              <div className={`${card} border p-3`}><p className="font-semibold mb-1">Easy</p><p className={muted}>Return & Refund</p></div>
            </div>
          </div>
        </div>

        <div className="mt-14">
          <h2 className="text-xl font-black uppercase mb-6">Ratings & Reviews</h2>
          {reviews.length > 0 && (
            <div className={`${card} border p-5 mb-8 max-w-md`}>
              <p className="text-3xl font-bold mb-1">★ {avgRating}</p>
              <p className={`text-xs ${muted} mb-4`}>{reviews.length} ratings</p>
              {ratingCounts.map(r => (
                <div key={r.star} className="flex items-center gap-2 text-xs mb-1">
                  <span className="w-8">{r.star}★</span>
                  <div className={`flex-1 h-1.5 ${darkMode ? 'bg-[#222]' : 'bg-gray-200'} rounded`}>
                    <div className="h-full bg-[#2c6660] rounded" style={{ width: reviews.length ? `${(r.count / reviews.length) * 100}%` : '0%' }} />
                  </div>
                  <span className={`w-6 text-right ${muted}`}>{r.count}</span>
                </div>
              ))}
            </div>
          )}
          {reviews.length === 0 ? (
            <p className={`${muted} mb-6`}>No reviews yet.</p>
          ) : (
            <div className="space-y-3 mb-8">
              {reviews.map(r => (
                <div key={r.id} className={`${card} border p-4`}>
                  <div className="flex justify-between mb-1">
                    <p className="font-semibold text-sm">{r.reviewer_name}</p>
                    <p className="text-sm text-[#2c6660]">{'★'.repeat(r.rating)}</p>
                  </div>
                  {r.comment && <p className={`text-sm ${muted}`}>{r.comment}</p>}
                  <p className="text-[11px] text-gray-500 mt-1">{new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleReviewSubmit} className={`${card} border p-5 space-y-3 max-w-lg`}>
            <h3 className="font-bold uppercase text-sm">Write a Review</h3>
            <input required placeholder="Your name" value={reviewForm.reviewer_name} onChange={e => setReviewForm({ ...reviewForm, reviewer_name: e.target.value })} className={`w-full border-b py-2 outline-none bg-transparent text-sm ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`} />
            <select value={reviewForm.rating} onChange={e => setReviewForm({ ...reviewForm, rating: e.target.value })} className={`w-full border-b py-2 outline-none bg-transparent text-sm ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`}>
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
            </select>
            <textarea placeholder="Comment" value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })} className={`w-full border p-2 outline-none bg-transparent text-sm ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`} rows={3} />
            <button type="submit" disabled={submittingReview} className="bg-[#2c6660] text-white px-5 py-2 font-mono text-xs uppercase disabled:opacity-50">{submittingReview ? '...' : 'Submit Review'}</button>
          </form>
        </div>

        {related.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-black uppercase mb-6">Frequently Bought Together</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map(p => (
                <Link key={p.id} href={`/product/${p.id}`} className={`${card} border overflow-hidden group`}>
                  <div className={`aspect-[3/4] ${imgBg}`}>
                    {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-mono text-sm text-[#2c6660]">₹{Number(p.price).toLocaleString('en-IN')}</p>
                      {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) && (
                        <p className={`font-mono text-xs line-through ${muted}`}>₹{Number(p.compare_at_price).toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {showSizeGuide && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowSizeGuide(false)}>
          <div className={`${bg} max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h3 className="font-black uppercase">Size Guide</h3>
              <button type="button" onClick={() => setShowSizeGuide(false)} className="font-mono text-sm">Close</button>
            </div>
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-[#ffffff]/20' : 'border-gray-300'}`}>
                  <th className="py-2">Size</th><th>Chest</th><th>Length</th><th>Shoulder</th>
                </tr>
              </thead>
              <tbody>
                {[['S','36','26','16'],['M','38','27','17'],['L','40','28','18'],['XL','42','29','19'],['XXL','44','30','20']].map(row => (
                  <tr key={row[0]} className={`border-b ${darkMode ? 'border-[#ffffff]/10' : 'border-gray-200'}`}>
                    {row.map((c, i) => <td key={i} className="py-2">{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showReturnPolicy && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowReturnPolicy(false)}>
          <div className={`${bg} max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h3 className="font-black uppercase text-sm">7 Day Return & Exchange Policy</h3>
              <button type="button" onClick={() => setShowReturnPolicy(false)} className="font-mono text-sm">Close</button>
            </div>
            <div className={`text-sm space-y-3 leading-relaxed ${muted}`}>
              <p>You may return or exchange eligible products within <strong className={text}>7 days</strong> of delivery.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Unused, unwashed, tags attached.</li>
                <li>Custom prints non-returnable unless print defect.</li>
                <li>Email artbit.hq@gmail.com with order number.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {showOrderForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bg} w-full max-w-md p-6 max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-black uppercase">Place Order</h2>
              <button type="button" onClick={() => setShowOrderForm(false)} className="text-sm font-mono">Close</button>
            </div>
            <div className={`${card} border p-3 text-sm mb-4`}>
              <p className="font-semibold">{product.name}</p>
              <p className={muted}>Size: {selectedSize || '—'} · Color: {selectedColor || '—'} · Qty: {orderForm.quantity}</p>
              <div className="mt-2 space-y-0.5">
                <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">₹{subtotal.toLocaleString('en-IN')}</span></div>
                {appliedCoupon && <div className="flex justify-between text-[#2c6660]"><span>Discount ({appliedCoupon.code})</span><span className="font-mono">−₹{orderDiscount.toLocaleString('en-IN')}</span></div>}
                <div className="flex justify-between font-semibold"><span>Total</span><span className="font-mono text-[#2c6660]">₹{orderTotal.toLocaleString('en-IN')}</span></div>
              </div>
            </div>
            <div className={`${card} border p-3 mb-4`}>
              <p className="text-xs font-mono uppercase text-gray-500 mb-2">Coupon Code</p>
              {appliedCoupon ? (
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm text-[#2c6660] font-bold">{appliedCoupon.code} applied</span>
                  <button type="button" onClick={removeCoupon} className="text-xs underline text-red-600">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="e.g. ARTBIT10" className={`flex-1 border px-2 py-1.5 text-sm outline-none bg-transparent uppercase ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`} />
                  <button type="button" onClick={applyCoupon} className="bg-[#000000] text-white px-3 py-1.5 text-xs font-mono uppercase">Apply</button>
                </div>
              )}
              {couponError && <p className="text-xs text-red-600 mt-1">{couponError}</p>}
            </div>
            <form className="space-y-4">
              <input required placeholder="Full Name *" value={orderForm.customer_name} onChange={e => setOrderForm({ ...orderForm, customer_name: e.target.value })} className={`w-full border-b py-2 outline-none bg-transparent ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`} />
              <input required type="email" placeholder="Email *" value={orderForm.customer_email} onChange={e => setOrderForm({ ...orderForm, customer_email: e.target.value })} className={`w-full border-b py-2 outline-none bg-transparent ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`} />
              <input required placeholder="Phone *" value={orderForm.customer_phone} onChange={e => setOrderForm({ ...orderForm, customer_phone: e.target.value })} className={`w-full border-b py-2 outline-none bg-transparent ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`} />
              <textarea required placeholder="Delivery Address *" value={orderForm.address} onChange={e => setOrderForm({ ...orderForm, address: e.target.value })} className={`w-full border p-2 outline-none bg-transparent ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`} rows={3} />
              <input type="number" min="1" max={product.stock || 10} value={orderForm.quantity} onChange={e => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 1 })} className={`w-full border-b py-2 outline-none bg-transparent ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`} />
              <div className="grid grid-cols-1 gap-2 pt-2">
                <button type="button" disabled={submitting} onClick={handlePayOnline} className="w-full bg-[#2c6660] text-white py-3 font-mono text-sm uppercase disabled:opacity-50">
                  {submitting ? 'Processing...' : `Pay Online ₹${orderTotal.toLocaleString('en-IN')}`}
                </button>
                <button type="button" disabled={submitting} onClick={handleCOD} className={`w-full border py-3 font-mono text-sm uppercase disabled:opacity-50 ${darkMode ? 'border-[#ffffff]/40' : 'border-[#000000]'}`}>
                  {submitting ? 'Processing...' : 'Cash on Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}