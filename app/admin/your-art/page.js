'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminYourArtPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [art, setArt] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState('')
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin')
      return
    }
    // Simple gate — same as your other admin pages
    setAuthorized(true)
    await fetchArt()
    setLoading(false)
  }

  const fetchArt = async () => {
    const { data } = await supabase
      .from('homepage_art')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setArt(data)
    if (data?.image_url) setPreview(data.image_url)
  }

  const onFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    if (f.size > 3 * 1024 * 1024) {
      alert('Max 3 MB')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setMsg('')
  }

  const handleUpload = async () => {
    if (!file) {
      alert('Choose an image first')
      return
    }
    setUploading(true)
    setMsg('')
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `art-${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('art-ads')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from('art-ads').getPublicUrl(path)
      const imageUrl = urlData.publicUrl

      // Deactivate old
      await supabase.from('homepage_art').update({ is_active: false }).eq('is_active', true)

      const { error: insErr } = await supabase.from('homepage_art').insert([{
        image_url: imageUrl,
        title: 'Your Art Here',
        is_active: true
      }])

      if (insErr) throw insErr

      setMsg('Saved! Homepage will show this image.')
      setFile(null)
      await fetchArt()
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setUploading(false)
  }

  const handleRemove = async () => {
    if (!confirm('Remove current art from homepage?')) return
    await supabase.from('homepage_art').update({ is_active: false }).eq('is_active', true)
    setArt(null)
    setPreview('')
    setFile(null)
    setMsg('Removed from homepage.')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center font-mono text-sm">
        Loading...
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/15 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs font-mono uppercase opacity-70 hover:opacity-100">
            ← Admin
          </Link>
          <h1 className="font-black uppercase text-lg">Your Art / Ad</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-sm text-white/60 mb-6 leading-relaxed">
          Upload an image for the homepage <strong className="text-white">“YOUR ART HERE”</strong> box.
          Recommended size: <strong className="text-white">1000 × 1000 px</strong> (square). JPG or PNG, max 3 MB.
        </p>

        <div className="border border-white/20 p-6 space-y-5">
          <div className="aspect-square max-w-sm mx-auto bg-[#1a1a1a] border border-white/10 overflow-hidden flex items-center justify-center">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <p className="text-xs font-mono uppercase text-white/40">No image</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-white/50 mb-2">
              Choose image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="block w-full text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-[#2c6660] file:text-white file:font-mono file:text-xs file:uppercase"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={uploading || !file}
              onClick={handleUpload}
              className="bg-[#2c6660] text-white px-5 py-2.5 font-mono text-xs uppercase disabled:opacity-40"
            >
              {uploading ? 'Uploading...' : 'Save to Homepage'}
            </button>
            {art && (
              <button
                type="button"
                onClick={handleRemove}
                className="border border-red-500/60 text-red-400 px-5 py-2.5 font-mono text-xs uppercase"
              >
                Remove from site
              </button>
            )}
          </div>

          {msg && <p className="text-sm text-[#2c6660] font-mono">{msg}</p>}
          {art?.image_url && (
            <p className="text-[11px] text-white/40 break-all">Current: {art.image_url}</p>
          )}
        </div>

        <p className="mt-6 text-xs text-white/40">
          After save, open homepage and hard-refresh (Ctrl+Shift+R) if needed.
        </p>
      </main>
    </div>
  )
}