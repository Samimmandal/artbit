'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

const CANCEL_REASONS = [
  'Ordered by mistake',
  'Found cheaper elsewhere',
  'Delivery taking too long',
  'Want to change size/color',
  'Changed my mind',
  'Wrong address entered',
  'Other'
]

export default function AccountPage() {
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [cancelModal, setCancelModal] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

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
    if (user) await fetchOrders(user)
    setLoading(false)
  }

  const fetchOrders = async (u) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .or(`user_id.eq.${u.id},customer_email.eq.${u.email}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setOrders([])
      return
    }

    const list = data || []
    const withItems = await Promise.all(
      list.map(async (order) => {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id)

        let enriched = items || []
        if (enriched.length > 0) {
          const ids = [...new Set(enriched.map(i => i.product_id))]
          const { data: products } = await supabase.from('products').select('id, name, image_url').in('id', ids)
          const map = {}
          ;(products || []).forEach(p => { map[p.id] = p })
          enriched = enriched.map(it => ({
            ...it,
            name: map[it.product_id]?.name || `Product #${it.product_id}`,
            image_url: map[it.product_id]?.image_url || null
          }))
        }
        return { ...order, items: enriched }
      })
    )
    setOrders(withItems)
  }

  const login = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href }
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setOrders([])
  }

  const isCOD = (order) =>
    order.payment_method === 'cod' || order.status === 'cod'

  const isCancelled = (order) =>
    order.status === 'cancelled' || order.status === 'canceled'

  const canCancel = (order) => {
    if (isCancelled(order)) return false
    if (order.status === 'delivered' || order.status === 'money_received') return false
    return true
  }

  const getSteps = (order) => {
    if (isCOD(order)) {
      return [
        { key: 'placed', label: 'Order Placed' },
        { key: 'shipped', label: 'Shipped' },
        { key: 'delivered', label: 'Delivered' }
      ]
    }
    return [
      { key: 'paid', label: 'Paid' },
      { key: 'shipped', label: 'Shipped' },
      { key: 'delivered', label: 'Delivered' }
    ]
  }

  const stepIndex = (order) => {
    const s = (order.status || '').toLowerCase()
    if (isCancelled(order)) return -1
    if (isCOD(order)) {
      if (s === 'shipped') return 1
      if (s === 'delivered' || s === 'money_received') return 2
      return 0
    }
    if (s === 'shipped') return 1
    if (s === 'delivered') return 2
    if (s === 'paid') return 0
    return 0
  }

  const notifyCancelTelegram = async (order, reason) => {
    try {
      await fetch('/api/send-order-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cancel',
          orderId: order.id,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          customer_phone: order.customer_phone,
          address: order.address,
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          status: order.status,
          cancel_reason: reason,
          items: (order.items || []).map(it => ({
            product_id: it.product_id,
            name: it.name,
            size: it.size || 'M',
            quantity: it.quantity || 1,
            price: Number(it.price || 0)
          }))
        })
      })
    } catch (e) {
      console.error('Telegram cancel notify failed', e)
    }
  }

  const handleCancel = async () => {
    if (!cancelModal || !cancelReason) {
      alert('Please select a reason')
      return
    }
    setCancelling(true)
    const order = cancelModal

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        tracking_note: `Cancelled by customer: ${cancelReason}`
      })
      .eq('id', order.id)

    if (error) {
      alert('Cancel failed: ' + error.message)
      setCancelling(false)
      return
    }

    await notifyCancelTelegram(order, cancelReason)
    setCancelModal(null)
    setCancelReason('')
    if (user) await fetchOrders(user)
    alert('Order cancelled successfully')
    setCancelling(false)
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

      <section className="max-w-3xl mx-auto px-5 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-black uppercase">My Orders</h1>
            <p className={`text-sm ${muted} mt-1`}>Track your orders here.</p>
          </div>
          {user && (
            <button onClick={logout} className={`text-xs font-mono underline ${muted}`}>
              Logout
            </button>
          )}
        </div>

        {loading ? (
          <p className="font-mono text-sm">Loading...</p>
        ) : !user ? (
          <div className={`${card} border p-8 text-center`}>
            <p className={`${muted} mb-4`}>Login to see your orders.</p>
            <button
              onClick={login}
              className="bg-[#000000] text-[#ffffff] px-6 py-3 font-mono text-xs uppercase"
            >
              Continue with Google
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className={`${card} border p-8 text-center`}>
            <p className={`${muted} mb-4`}>No orders yet.</p>
            <Link href="/shop" className="underline text-sm">Browse products →</Link>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map(order => {
              const steps = getSteps(order)
              const active = stepIndex(order)
              const cancelled = isCancelled(order)

              return (
                <div key={order.id} className={`${card} border p-5`}>
                  <div className="flex justify-between items-start gap-3 flex-wrap mb-3">
                    <div>
                      <p className="font-bold uppercase text-sm">Order #{order.id}</p>
                      <p className={`text-xs font-mono mt-0.5 ${
                        isCOD(order) ? 'text-[#e2a233]' : 'text-[#2c6660]'
                      }`}>
                        {isCOD(order) ? 'CASH ON DELIVERY' : 'PAID ONLINE'}
                      </p>
                      <p className={`text-xs ${muted} mt-1`}>
                        Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </p>
                      <p className="font-mono text-sm mt-1 text-[#2c6660] font-semibold">
                        ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <span className={`text-[10px] font-mono uppercase px-2 py-1 border ${
                      cancelled
                        ? 'border-red-500 text-red-500'
                        : isCOD(order)
                          ? 'border-[#e2a233] text-[#e2a233]'
                          : 'border-[#2c6660] text-[#2c6660]'
                    }`}>
                      {cancelled ? 'Cancelled' : isCOD(order) ? 'Cash on Delivery' : 'Paid'}
                    </span>
                  </div>

                  {cancelled ? (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="px-2 py-1 bg-red-600 text-white uppercase">Cancelled</span>
                        {order.tracking_note && (
                          <span className={muted}>{order.tracking_note}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {steps.map((step, i) => (
                        <span
                          key={step.key}
                          className={`text-[10px] font-mono uppercase px-2 py-1 ${
                            i <= active
                              ? 'bg-[#2c6660] text-white'
                              : darkMode
                                ? 'bg-[#222] text-[#888]'
                                : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {step.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {order.tracking_note && !cancelled && (
                    <p className={`text-xs ${muted} mb-2`}>Note: {order.tracking_note}</p>
                  )}
                  {order.address && (
                    <p className={`text-xs ${muted} mb-3`}>{order.address}</p>
                  )}

                  {order.items?.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex gap-2 items-center text-xs">
                          {it.image_url && (
                            <img src={it.image_url} alt="" className="w-10 h-12 object-cover" />
                          )}
                          <div>
                            <p className="font-semibold">{it.name}</p>
                            <p className={muted}>Size: {it.size || '—'} · Qty: {it.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {canCancel(order) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCancelModal(order)
                        setCancelReason('')
                      }}
                      className="text-xs text-red-600 underline font-mono mt-1"
                    >
                      Cancel order
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {cancelModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`${bg} w-full max-w-md p-6`}>
            <h3 className="font-black uppercase text-sm mb-1">Cancel Order #{cancelModal.id}</h3>
            <p className={`text-xs ${muted} mb-4`}>Select a reason to continue.</p>
            <div className="space-y-2 mb-5">
              {CANCEL_REASONS.map(r => (
                <label key={r} className={`flex items-center gap-2 text-sm cursor-pointer p-2 border ${
                  cancelReason === r
                    ? 'border-[#2c6660]'
                    : darkMode ? 'border-[#ffffff]/20' : 'border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="cancel_reason"
                    value={r}
                    checked={cancelReason === r}
                    onChange={() => setCancelReason(r)}
                  />
                  {r}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={cancelling || !cancelReason}
                onClick={handleCancel}
                className="flex-1 bg-red-600 text-white py-2.5 font-mono text-xs uppercase disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                className={`flex-1 border py-2.5 font-mono text-xs uppercase ${
                  darkMode ? 'border-[#ffffff]/40' : 'border-[#000000]'
                }`}
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}