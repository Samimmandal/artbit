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

    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!token || !chatId) {
      console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing in env')
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