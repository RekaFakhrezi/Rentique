import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { clothingTypes, CollectionError, ProductGrid, useResource } from './Collection.jsx'

function FilterSelect({ label, value, onChange, children }) {
  return <label className="rt-filter-select">
    <span>{label}</span>
    <span className="rt-select-wrap"><select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>{children}</select><ChevronDown size={14} /></span>
  </label>
}

export function Catalog() {
  const [params, setParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const products = useResource('/clothings')
  const categories = useResource('/categories')
  const items = Array.isArray(products.data) ? products.data : []
  const types = params.get('type') || ''
  const query = params.get('q') || ''
  const size = params.get('size') || ''
  const category = params.get('category') || ''
  const available = params.get('available') || ''
  const sort = params.get('sort') || ''
  const filterCount = [size, category, available].filter(Boolean).length
  function update(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true, preventScrollReset: true })
  }
  let visible = items.filter(item =>
    (!types || item.type === types) &&
    (!size || item.size === size) &&
    (!category || String(item.category_id) === category) &&
    (!available || (available === 'yes' ? Number(item.stock) > 0 : Number(item.stock) === 0)) &&
    (!query.trim() || [item.name, item.color, item.description, clothingTypes[item.type]?.label]
      .filter(Boolean).join(' ').toLocaleLowerCase('id').includes(query.trim().toLocaleLowerCase('id')))
  )
  if (sort === 'low' || sort === 'high') visible.sort((a, b) =>
    (a.rental_price_per_day - b.rental_price_per_day) * (sort === 'low' ? 1 : -1)
  )
  const sizes = [...new Set(items.map(item => item.size).filter(Boolean))]
  return <main className="rt-frame rt-catalog">
    <nav className="rt-crumbs" aria-label="Jejak halaman"><Link to="/">Beranda</Link><ChevronRight /><span>Koleksi</span></nav>
    <div className="rt-page-intro">
      <h1>Koleksi Rentique</h1>
      <p>Temukan pakaian untuk agenda berikutnya.</p>
    </div>
    <div className="rt-catalog-toolbar">
      <div className="rt-type-tabs" role="group" aria-label="Jenis pakaian">
        {[['', { label: 'Semua' }], ...Object.entries(clothingTypes)].map(([type, item]) =>
          <button key={type} type="button" aria-pressed={type === types} onClick={() => update('type', type)}>{item.label}</button>)}
      </div>
      <div className="rt-catalog-tools">
        <label className="rt-search"><Search size={17} strokeWidth={1.6} /><input aria-label="Cari pakaian" type="search"
          value={query} placeholder="Cari pakaian…" onChange={e => update('q', e.target.value)} /></label>
        <button className="rt-filter-button" aria-expanded={showFilters} aria-controls="rt-filters" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal size={16} /> Filter{filterCount > 0 ? ' (' + filterCount + ')' : ''}
        </button>
      </div>
    </div>
    {showFilters && <div className="rt-filters" id="rt-filters">
      <FilterSelect label="Kategori acara" value={category} onChange={v => update('category', v)}>
        <option value="">Semua kategori</option>{(categories.data || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </FilterSelect>
      <FilterSelect label="Ukuran" value={size} onChange={v => update('size', v)}>
        <option value="">Semua ukuran</option>{sizes.map(value => <option key={value}>{value}</option>)}
      </FilterSelect>
      <FilterSelect label="Ketersediaan" value={available} onChange={v => update('available', v)}>
        <option value="">Semua stok</option><option value="yes">Tersedia</option><option value="no">Sedang disewa</option>
      </FilterSelect>
      {categories.error && <CollectionError message={categories.error} retry={categories.retry} />}
    </div>}
    <div className="rt-results-line">
      <span aria-live="polite">{products.loading ? 'Memuat koleksi…' : visible.length + ' pakaian'}
        {params.size > 0 && <button className="rt-reset" onClick={() => setParams({})}>Hapus filter <X size={12} /></button>}</span>
      <label className="rt-sort"><span>Urutkan</span><span className="rt-select-wrap"><select aria-label="Urutkan koleksi" value={sort} onChange={e => update('sort', e.target.value)}>
        <option value="">Pilihan Rentique</option><option value="low">Harga terendah</option><option value="high">Harga tertinggi</option>
      </select><ChevronDown size={14} /></span></label>
    </div>
    {products.error ? <CollectionError message={products.error} retry={products.retry} />
      : !products.loading && !visible.length ? <div className="rt-empty"><Search size={28} strokeWidth={1.2} />
        <h2>Pakaian belum ditemukan</h2><p>Coba kata kunci lain atau sesuaikan filter koleksi.</p>
        <button className="rt-primary" onClick={() => setParams({})}>Tampilkan semua</button></div>
      : <ProductGrid products={visible} loading={products.loading} />}
  </main>
}
