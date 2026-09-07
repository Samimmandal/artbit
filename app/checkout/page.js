'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CheckoutPage() {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    address: ''
  })

  useEffect(() => {
    const saved = localStorage.getItem('artbit-theme')
    if (saved === 'dark') setDarkMode(true)
    init()
  }, [])

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('artbit-theme', next ? 'dark' : 'light')
  }

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (!user) {
      setLoading(false)
      return
    }
    setForm(f => ({
      ...f,
      customer_email: user.email || f.customer_email,
      customer_name: user.user_metadata?.full_name || user.user_metadata?.name || f.customer_name
    }))
    await fetchCart(user.id)
  }

  const fetchCart = async (userId) => {
    setErrorMsg('')
    const { data: cartRows, error: cartErr } = await supabase
      .from('cart')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (cartErr) {
      setErrorMsg(cartErr.message)
      setItems([])
      setLoading(false)
      return
    }

    if (!cartRows || cartRows.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    const ids = [...new Set(cartRows.map(r => r.product_id))]
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', ids)

    const map = {}
    ;(products || []).forEach(p => { map[p.id] = p })

    setItems(cartRows.map(row => ({
      ...row,
      products: map[row.product_id] || null
    })))
    setLoading(false)
  }

  const subtotal = items.reduce((sum, item) => {
    return sum + Number(item.products?.price || 0) * (item.quantity || 1)
  }, 0)

  const discount = (() => {
    if (!appliedCoupon) return 0
    if (appliedCoupon.discount_percent) {
      return Math.round(subtotal * (appliedCoupon.discount_percent / 100))
    }
    return appliedCoupon.discount_amount || 0
  })()

  const total = Math.max(0, subtotal - discount)

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

  const loadRazorpayScript = () => new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

  const clearCart = async (userId) => {
    await supabase.from('cart').delete().eq('user_id', userId)
  }

  const saveOrder = async (status, paymentMethod) => {
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        address: form.address,
        total_amount: total,
        status,
        payment_method: paymentMethod,
        user_id: user?.id || null,
        tracking_note: appliedCoupon ? `Coupon: ${appliedCoupon.code}` : null
      }])
      .select()
      .single()

    if (error) throw error

    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity || 1,
      price: Number(item.products?.price || 0),
      size: item.size || 'M'
    }))

    if (orderItems.length > 0) {
      await supabase.from('order_items').insert(orderItems)
    }

    if (user?.id) await clearCart(user.id)
    return order
  }

  const handlePayOnline = async (e) => {
    e.preventDefault()
    if (!form.customer_name || !form.customer_email || !form.customer_phone || !form.address) {
      alert('Please fill all required fields')
      return
    }
    if (items.length === 0) {
      alert('Cart is empty')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total })
      })
      const razorpayOrder = await res.json()
      if (!razorpayOrder.id) throw new Error(razorpayOrder.error || 'Failed to create payment order')

      await loadRazorpayScript()
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || 'INR',
        name: 'Artbit',
        description: `Order · ${items.length} item(s)`,
        order_id: razorpayOrder.id,
        handler: async function () {
          try {
            await saveOrder('paid', 'online')
            alert('Payment successful! Order placed.')
            router.push('/account')
          } catch (err) {
            alert('Order save failed: ' + err.message)
          }
        },
        prefill: {
          name: form.customer_name,
          email: form.customer_email,
          contact: form.customer_phone
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
    if (!form.customer_name || !form.customer_email || !form.customer_phone || !form.address) {
      alert('Please fill all required fields')
      return
    }
    if (items.length === 0) {
      alert('Cart is empty')
      return
    }
    if (!confirm('Place order with Cash on Delivery?')) return
    setSubmitting(true)
    try {
      await saveOrder('cod', 'cod')
      alert('COD order placed! Pay when you receive the product.')
      router.push('/account')
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setSubmitting(false)
  }

  const bg = darkMode ? 'bg-[#000000]' : 'bg-[#f2ede1]'
  const text = darkMode ? 'text-[#ffffff]' : 'text-[#000000]'
  const muted = darkMode ? 'text-[#cccccc]' : 'text-[#333333]'
  const card = darkMode ? 'bg-[#0a0a0a] border-[#ffffff]/20' : 'bg-white border-[#000000]/15'
  const border = darkMode ? 'border-[#ffffff]/20' : 'border-[#000000]/15'
  const iconCls = `p-1.5 transition opacity-90 hover:opacity-100 ${
    darkMode ? 'hover:text-[#e2a233]' : 'hover:text-[#2c6660]'
  }`

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      <header className={`border-b ${border} sticky top-0 ${bg} z-50`}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <Link href="/" className="shrink-0 flex items-center">
            <img
              src={darkMode ? '/logo-white.png' : '/logo.png'}
              alt="Artbit"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/cart" className={iconCls} aria-label="Cart" title="Back to Cart">
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

      <section className="max-w-3xl mx-auto px-5 sm:px-6 py-10">
        <h1 className="text-3xl font-black uppercase mb-8">Checkout</h1>
        {errorMsg && <p className="text-red-600 text-sm mb-4 font-mono">{errorMsg}</p>}

        {loading ? (
          <p className="font-mono text-sm">Loading...</p>
        ) : !user ? (
          <div className={`${card} border p-8 text-center`}>
            <p className={`${muted} mb-4`}>Please login to checkout.</p>
            <button
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })}
              className="bg-[#000000] text-[#ffffff] px-6 py-3 font-mono text-xs uppercase"
            >
              Continue with Google
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className={`${card} border p-8 text-center`}>
            <p className={`${muted} mb-4`}>No items.</p>
            <Link href="/cart" className="underline text-sm">Go to cart →</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order summary */}
            <div className={`${card} border p-5 space-y-3`}>
              <p className="text-xs font-mono uppercase font-semibold mb-2">Order summary</p>
              {items.map(item => (
                <div key={item.id} className="flex gap-3 items-center">
                  <div className="w-14 h-16 shrink-0 overflow-hidden bg-[#e9e1d1]">
                    {item.products?.image_url && (
                      <img src={item.products.image_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm uppercase truncate">{item.products?.name || `Product #${item.product_id}`}</p>
                    <p className={`text-xs ${muted}`}>Size: {item.size || '—'} · Qty: {item.quantity || 1}</p>
                  </div>
                  <p className="font-mono text-sm text-[#2c6660] shrink-0">
                    ₹{(Number(item.products?.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
              <div className={`border-t ${border} pt-3 space-y-1 text-sm`}>
                <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">₹{subtotal.toLocaleString('en-IN')}</span></div>
                {appliedCoupon && (
                  <div className="flex justify-between text-[#2c6660]">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span className="font-mono">−₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="font-mono text-[#2c6660]">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Coupon */}
            <div className={`${card} border p-4`}>
              <p className="text-xs font-mono uppercase font-semibold mb-2">Coupon</p>
              {appliedCoupon ? (
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm text-[#2c6660] font-bold">{appliedCoupon.code} applied</span>
                  <button type="button" onClick={removeCoupon} className="text-xs underline text-red-600">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ARTBIT10"
                    className={`flex-1 border px-3 py-2 text-sm outline-none bg-transparent uppercase ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`}
                  />
                  <button type="button" onClick={applyCoupon} className="bg-[#000000] text-white px-4 py-2 text-xs font-mono uppercase">
                    Apply
                  </button>
                </div>
              )}
              {couponError && <p className="text-xs text-red-600 mt-1">{couponError}</p>}
            </div>

            {/* Address form */}
            <form className={`${card} border p-5 space-y-4`}>
              <p className="text-xs font-mono uppercase font-semibold mb-1">Delivery details</p>
              <input
                required
                placeholder="Full Name *"
                value={form.customer_name}
                onChange={e => setForm({ ...form, customer_name: e.target.value })}
                className={`w-full border-b py-2 outline-none bg-transparent ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`}
              />
              <input
                required
                type="email"
                placeholder="Email *"
                value={form.customer_email}
                onChange={e => setForm({ ...form, customer_email: e.target.value })}
                className={`w-full border-b py-2 outline-none bg-transparent ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`}
              />
              <input
                required
                placeholder="Phone *"
                value={form.customer_phone}
                onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                className={`w-full border-b py-2 outline-none bg-transparent ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`}
              />
              <textarea
                required
                placeholder="Full delivery address *"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                rows={3}
                className={`w-full border p-2 outline-none bg-transparent ${darkMode ? 'border-[#ffffff]/30' : 'border-gray-300'}`}
              />

              <div className="grid grid-cols-1 gap-2 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handlePayOnline}
                  className="w-full bg-[#2c6660] text-white py-3.5 font-mono text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : `Pay Online ₹${total.toLocaleString('en-IN')}`}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleCOD}
                  className={`w-full border py-3.5 font-mono text-xs uppercase tracking-wider disabled:opacity-50 ${darkMode ? 'border-[#ffffff]/40' : 'border-[#000000]'}`}
                >
                  {submitting ? 'Processing...' : 'Cash on Delivery'}
                </button>
              </div>
            </form>

            <p className={`text-center text-xs ${muted}`}>
              <Link href="/cart" className="underline">← Back to cart</Link>
            </p>
          </div>
        )}
      </section>
    </div>
  )
}