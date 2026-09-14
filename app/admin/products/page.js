'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function makeSlug(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `product-${Date.now()}`
}

const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL']

const emptyForm = {
  name: '',
  price: '',
  compare_at_price: '',
  description: '',
  tag: '',
  offer_text: '',
  category: 'tees',
  featured: false,
  image_url: '',
  images: [],
  stock: 100,
  sizes: ['S', 'M', 'L']
}

export default function AdminProductsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [mainFile, setMainFile] = useState(null)
  const [mainPreview, setMainPreview] = useState('')
  const [moreFiles, setMoreFiles] = useState([])
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('artbit-admin-theme')
    if (saved === 'light') setDarkMode(false)
    init()
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin')
      return
    }
    await fetchProducts()
    setLoading(false)
  }

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error(error)
    setProducts(data || [])
  }

  const uploadImage = async (file) => {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw error
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  }

  const onMainChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setMainFile(f)
    setMainPreview(URL.createObjectURL(f))
  }

  const onMoreChange = (e) => {
    const files = Array.from(e.target.files || [])
    setMoreFiles((prev) => [...prev, ...files])
  }

  const removeExistingExtra = (url) => {
    setForm((f) => ({
      ...f,
      images: (f.images || []).filter((u) => u !== url)
    }))
  }

  const toggleSize = (size) => {
    setForm((f) => {
      const current = f.sizes || []
      if (current.includes(size)) {
        return { ...f, sizes: current.filter((s) => s !== size) }
      }
      return { ...f, sizes: [...current, size] }
    })
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditId(null)
    setMainFile(null)
    setMainPreview('')
    setMoreFiles([])
  }

  const parseSizes = (raw) => {
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      } catch {
        return raw.split(',').map((s) => s.trim()).filter(Boolean)
      }
    }
    return ['S', 'M', 'L']
  }

  const startEdit = (p) => {
    setEditId(p.id)
    let imgs = []
    if (Array.isArray(p.images)) imgs = p.images
    else if (typeof p.images === 'string') {
      try {
        imgs = JSON.parse(p.images)
      } catch {
        imgs = []
      }
    }
    setForm({
      name: p.name || '',
      price: p.price ?? '',
      compare_at_price: p.compare_at_price ?? '',
      description: p.description || '',
      tag: p.tag || '',
      offer_text: p.offer_text || '',
      category: p.category || 'tees',
      featured: !!p.featured,
      image_url: p.image_url || '',
      images: imgs,
      stock: p.stock ?? 100,
      sizes: parseSizes(p.sizes)
    })
    setMainPreview(p.image_url || '')
    setMainFile(null)
    setMoreFiles([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Product name required')
      return
    }
    if (form.price === '' || form.price === null || form.price === undefined) {
      alert('Price required')
      return
    }
    if (!form.sizes || form.sizes.length === 0) {
      alert('Select at least one size')
      return
    }

    setSaving(true)
    try {
      let imageUrl = form.image_url
      if (mainFile) {
        imageUrl = await uploadImage(mainFile)
      }

      let extraImages = [...(form.images || [])]
      for (const f of moreFiles) {
        const url = await uploadImage(f)
        extraImages.push(url)
      }

      const slug = makeSlug(form.name)

      const payload = {
        name: form.name.trim(),
        slug,
        price: Number(form.price) || 0,
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        description: form.description || '',
        tag: form.tag || null,
        offer_text: form.offer_text || null,
        category: form.category || 'tees',
        featured: !!form.featured,
        image_url: imageUrl || null,
        images: extraImages,
        sizes: form.sizes,
        stock: Number(form.stock) >= 0 ? Number(form.stock) : 0
      }

      let error
      if (editId) {
        ;({ error } = await supabase.from('products').update(payload).eq('id', editId))
      } else {
        ;({ error } = await supabase.from('products').insert([payload]))
      }

      if (error) throw error

      alert(editId ? 'Product updated' : 'Product added')
      resetForm()
      await fetchProducts()
    } catch (err) {
      console.error(err)
      alert('Error: ' + (err.message || err))
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      alert(error.message)
      return
    }
    await fetchProducts()
  }

  const bg = darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f2ede1]'
  const text = darkMode ? 'text-white' : 'text-black'
  const muted = darkMode ? 'text-white/50' : 'text-black/60'
  const input = darkMode
    ? 'bg-[#111] border-white/20 text-white'
    : 'bg-white border-black/20 text-black'
  const card = darkMode ? 'border-white/10 bg-[#111]' : 'border-black/10 bg-white'

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} ${text} flex items-center justify-center font-mono text-sm`}>
        Loading...
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      <header className={`border-b ${darkMode ? 'border-white/10' : 'border-black/10'} px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className={`text-xs font-mono uppercase ${muted}`}>
            ← Dashboard
          </Link>
          <h1 className="font-black uppercase text-lg">Products</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setDarkMode(!darkMode)
            localStorage.setItem('artbit-admin-theme', !darkMode ? 'dark' : 'light')
          }}
          className={`text-[10px] font-mono uppercase border px-3 py-1.5 ${darkMode ? 'border-white/20' : 'border-black/20'}`}
        >
          {darkMode ? 'Light' : 'Dark'}
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-10">
        <section className={`border p-5 space-y-4 ${card}`}>
          <h2 className="font-black uppercase text-sm">
            {editId ? `Edit product #${editId}` : 'Add product'}
          </h2>

          <div>
            <label className={`block text-xs font-mono uppercase mb-1 ${muted}`}>Name *</label>
            <input
              className={`w-full border px-3 py-2 text-sm ${input}`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Product name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-mono uppercase mb-1 ${muted}`}>Price *</label>
              <input
                type="number"
                className={`w-full border px-3 py-2 text-sm ${input}`}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <label className={`block text-xs font-mono uppercase mb-1 ${muted}`}>Compare at</label>
              <input
                type="number"
                className={`w-full border px-3 py-2 text-sm ${input}`}
                value={form.compare_at_price}
                onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-mono uppercase mb-1 ${muted}`}>Stock *</label>
            <input
              type="number"
              min="0"
              className={`w-full border px-3 py-2 text-sm ${input}`}
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder="How many pieces available"
            />
          </div>

          {/* Sizes — admin chooses */}
          <div>
            <label className={`block text-xs font-mono uppercase mb-2 ${muted}`}>
              Available sizes * (tick only what you have)
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_SIZES.map((size) => {
                const selected = (form.sizes || []).includes(size)
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`min-w-[52px] px-3 py-2 text-xs font-mono uppercase border transition ${
                      selected
                        ? 'bg-[#2c6660] border-[#2c6660] text-white'
                        : darkMode
                          ? 'border-white/25 text-white/70'
                          : 'border-black/25 text-black/70'
                    }`}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
            <p className={`text-[11px] mt-2 ${muted}`}>
              Selected: {(form.sizes || []).join(', ') || 'none'}
            </p>
          </div>

          <div>
            <label className={`block text-xs font-mono uppercase mb-1 ${muted}`}>Description</label>
            <textarea
              rows={3}
              className={`w-full border px-3 py-2 text-sm ${input}`}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-mono uppercase mb-1 ${muted}`}>Tag</label>
              <input
                className={`w-full border px-3 py-2 text-sm ${input}`}
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                placeholder="BEST SELLER"
              />
            </div>
            <div>
              <label className={`block text-xs font-mono uppercase mb-1 ${muted}`}>Offer text</label>
              <input
                className={`w-full border px-3 py-2 text-sm ${input}`}
                value={form.offer_text}
                onChange={(e) => setForm({ ...form, offer_text: e.target.value })}
                placeholder="BUY 3 GET 10% OFF"
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-mono uppercase mb-1 ${muted}`}>Category</label>
            <select
              className={`w-full border px-3 py-2 text-sm ${input}`}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="tees">Tees</option>
              <option value="hoodies">Hoodies</option>
              <option value="oversized">Oversized</option>
              <option value="kids">Kids</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className={`block text-xs font-mono uppercase mb-1 ${muted}`}>Main photo</label>
            {mainPreview && (
              <div className="relative w-32 mb-2">
                <img src={mainPreview} alt="" className="w-32 h-40 object-cover border border-white/10" />
                <span className="absolute bottom-1 left-1 bg-black text-white text-[9px] px-1">MAIN</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={onMainChange} className="text-sm" />
          </div>

          <div>
            <label className={`block text-xs font-mono uppercase mb-1 ${muted}`}>
              More photos (from PC – multiple allowed)
            </label>
            <input type="file" accept="image/*" multiple onChange={onMoreChange} className="text-sm" />
            <div className="flex flex-wrap gap-2 mt-2">
              {(form.images || []).map((url) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="w-16 h-20 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingExtra(url)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
              {moreFiles.map((f, i) => (
                <div key={i} className="text-[10px] font-mono opacity-60 truncate max-w-[80px]">
                  {f.name}
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            Featured on homepage
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="bg-[#2c6660] text-white px-5 py-2.5 font-mono text-xs uppercase disabled:opacity-50"
            >
              {saving ? 'Saving...' : editId ? 'Update product' : 'Save product'}
            </button>
            {editId && (
              <button
                type="button"
                onClick={resetForm}
                className={`border px-5 py-2.5 font-mono text-xs uppercase ${darkMode ? 'border-white/20' : 'border-black/20'}`}
              >
                Cancel edit
              </button>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-black uppercase text-sm mb-4">All products ({products.length})</h2>
          <div className="space-y-3">
            {products.map((p) => {
              const sizesLabel = parseSizes(p.sizes).join(', ')
              return (
                <div key={p.id} className={`border p-3 flex gap-3 items-center ${card}`}>
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="w-14 h-16 object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-16 bg-black/20 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm uppercase truncate">{p.name}</p>
                    <p className={`text-xs font-mono ${muted}`}>
                      ₹{Number(p.price || 0).toLocaleString('en-IN')}
                      {p.stock != null ? ` · stock ${p.stock}` : ''}
                      {sizesLabel ? ` · ${sizesLabel}` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => startEdit(p)} className="text-xs font-mono underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(p.id)} className="text-xs font-mono text-red-500 underline">
                    Delete
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}