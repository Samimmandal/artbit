import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN || ''
  const chatId = process.env.TELEGRAM_CHAT_ID || ''

  return NextResponse.json({
    hasToken: !!token,
    tokenLength: token.length,
    tokenStartsWith: token.slice(0, 8),
    hasChatId: !!chatId,
    chatId: chatId
  })
}