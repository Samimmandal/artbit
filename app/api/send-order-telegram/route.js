import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const body = await req.json()
    const {
      orderId,
      customer_name,
      customer_email,
      customer_phone,
      address,
      total_amount,
      payment_method,
      status,
      coupon,
      items = []
    } = body

    // ↓↓↓ এখানে টোকেন ও Chat ID বসাও ↓↓↓
    const token = process.env.TELEGRAM_BOT_TOKEN || '8952395629:AAHAGZExvnX4_aRtTNiipf2Kk8tilX6AEUg'
    const chatId = process.env.TELEGRAM_CHAT_ID || '198776720'
    // ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

    if (!token || token.includes('PASTE_') || !chatId || String(chatId).includes('PASTE_')) {
      console.error('Telegram token or chat id missing')
      return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 })
    }

    const payLabel =
      payment_method === 'cod' || status === 'cod'
        ? 'Cash on Delivery'
        : 'Paid Online'

    const itemsText = (items || [])
      .map((it, i) => {
        const name = it.name || `Product #${it.product_id}`
        return `${i + 1}. ${name}\n   Size: ${it.size || '—'} | Qty: ${it.quantity || 1} | ₹${Number(it.price || 0).toLocaleString('en-IN')}`
      })
      .join('\n')

    const text = [
      `🛒 NEW ORDER #${orderId || '—'}`,
      ``,
      `👤 Customer`,
      `Name: ${customer_name || '—'}`,
      `Email: ${customer_email || '—'}`,
      `Phone: ${customer_phone || '—'}`,
      `Address: ${address || '—'}`,
      ``,
      `💳 Payment`,
      `Method: ${payLabel}`,
      `Status: ${status || '—'}`,
      `Coupon: ${coupon || 'None'}`,
      `Total: ₹${Number(total_amount || 0).toLocaleString('en-IN')}`,
      ``,
      `📦 Items`,
      itemsText || 'No items',
      ``,
      `— Artbit · artbit.co.in`
    ].join('\n')

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    })

    const data = await res.json()
    if (!data.ok) {
      console.error('Telegram error', data)
      return NextResponse.json({ error: data.description || 'Failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}