import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, RotateCw, Shirt } from 'lucide-react'
import { api, rupiah, useLoad } from '../../shared.jsx'

export const clothingTypes = {
  DRESS: { label: 'Gaun', image: '/images/dress.webp' },
  SUIT: { label: 'Jas', image: '/images/suit.webp' },
  COSTUME: { label: 'Kostum', image: '/images/costume.webp' },
}

export function useResource(path) {
  return useLoad(() => api(path), path)
}

export function CollectionError({ message, retry }) {
  return <div className="rt-feedback" role="alert">
    <p>{message}</p>
    <button className="rt-text-link" onClick={retry}><RotateCw size={15} /> Coba lagi</button>
  </div>
}

export function ProductImage({ product, eager = false }) {
  const fallback = clothingTypes[product.type]?.image
  const [failed, setFailed] = useState([])
  const src = [product.image_url, fallback].find(url => url && !failed.includes(url))
  if (!src) return <span className="rt-photo-fallback" role="img" aria-label={product.name}><Shirt size={50} strokeWidth={1} /></span>
  return <img src={src} alt={product.name} loading={eager ? 'eager' : 'lazy'}
    onError={() => setFailed(values => [...values, src])} />
}

export function Availability({ stock }) {
  return <span className={Number(stock) > 0 ? 'rt-availability' : 'rt-availability rt-out'}>
    {Number(stock) > 0 ? 'Tersedia' : 'Sedang disewa'}
  </span>
}

function ProductCard({ product }) {
  return <Link className="rt-product-card" to={'/clothing/' + product.id} aria-label={'Lihat detail ' + product.name}>
    <div className="rt-product-photo">
      <ProductImage product={product} />
      <span className="rt-card-action">Lihat detail <ArrowUpRight size={15} /></span>
    </div>
    <div className="rt-product-meta"><span>{clothingTypes[product.type]?.label}</span><span>Ukuran {product.size}</span></div>
    <h3>{product.name}</h3>
    <div className="rt-price">{rupiah(product.rental_price_per_day)} <small>/ hari</small></div>
    <Availability stock={product.stock} />
  </Link>
}

export function ProductGrid({ products, loading }) {
  return <div className="rt-products" aria-busy={loading || undefined}>
    {loading
      ? Array.from({ length: 4 }, (_, i) => <div className="rt-skeleton" key={i} aria-hidden="true"><div /><span /><span /></div>)
      : products.map(product => <ProductCard key={product.id} product={product} />)}
  </div>
}
