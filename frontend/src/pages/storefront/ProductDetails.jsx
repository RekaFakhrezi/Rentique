import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Check, ChevronRight, Minus, Plus, ShoppingBag } from 'lucide-react'
import { api, rupiah, useBag } from '../../shared.jsx'
import { Availability, clothingTypes, CollectionError, ProductImage, useResource } from './Collection.jsx'

function Stepper({ name, value, setValue, maximum }) {
  const change = delta => setValue(String(Math.max(1, Math.min(maximum ?? Infinity, (Number(value) || 0) + delta))))
  return <div className="rt-stepper-field">
    <span>{name}</span>
    <span className="rt-stepper">
      <button type="button" aria-label={'Kurangi ' + name.toLowerCase()} disabled={Number(value) <= 1} onClick={() => change(-1)}><Minus size={15} /></button>
      <input required aria-label={name} type="number" min="1" max={maximum} step="1" value={value} onChange={e => setValue(e.target.value)} />
      <button type="button" aria-label={'Tambah ' + name.toLowerCase()} disabled={maximum !== undefined && Number(value) >= maximum} onClick={() => change(1)}><Plus size={15} /></button>
    </span>
  </div>
}

function RentalOptions({ product }) {
  const bag = useBag()
  const [qty, setQty] = useState('1')
  const [duration, setDuration] = useState(String(bag.days || 1))
  const [notice, setNotice] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [estimate, setEstimate] = useState({})
  const [attempt, setAttempt] = useState(0)
  const inBag = Number(bag.items.find(item => Number(item.clothing_id) === Number(product.id))?.quantity || 0)
  const available = Number(product.stock) - inBag
  const quantity = Number(qty)
  const days = Number(duration)
  const valid = Number.isSafeInteger(quantity) && quantity > 0 && quantity <= available && Number.isSafeInteger(days) && days > 0
  const requestKey = [product.id, quantity, days, attempt].join('/')
  useEffect(() => {
    if (!valid) return
    let current = true
    const timer = window.setTimeout(() => {
      api('/rentals/quote', {
        method: 'POST',
        body: { rental_days: days, items: [{ clothing_id: Number(product.id), quantity }] },
      }).then(
        data => { if (current) setEstimate({ requestKey, total: data.total_price }) },
        error => { if (current) setEstimate({ requestKey, error: error.message }) }
      )
    }, 180)
    return () => { current = false; window.clearTimeout(timer) }
  }, [product.id, quantity, days, valid, requestKey])
  const ready = valid && estimate.requestKey === requestKey && estimate.total != null
  function adjust(setter, value) {
    setNotice('')
    setSubmitError('')
    setter(value)
  }
  function submit(event) {
    event.preventDefault()
    if (!ready) return
    try {
      bag.add(Number(product.id), quantity, days)
      setNotice(quantity + ' item masuk ke tas sewa.')
    } catch (error) { setSubmitError(error.message) }
  }
  return <form className="rt-rental-options" onSubmit={submit}>
    {available > 0 && <div className="rt-stepper-row">
      <Stepper name="Jumlah" value={qty} maximum={available} setValue={v => adjust(setQty, v)} />
      <Stepper name="Durasi (hari)" value={duration} setValue={v => adjust(setDuration, v)} />
    </div>}
    {bag.count > 0 && days !== Number(bag.days) && valid && <p className="rt-bag-hint">Durasi seluruh tas akan menjadi {days} hari.</p>}
    {available > 0 && <div className="rt-estimate"><span>Estimasi sewa</span><strong aria-live="polite">{ready ? rupiah(estimate.total) : '—'}</strong></div>}
    {available <= 0 && <p className="rt-bag-hint">{inBag ? 'Semua stok yang tersedia sudah ada di tas sewa.' : 'Pakaian ini sedang disewa.'}</p>}
    {available > 0 && !valid && <p className="rt-invalid" role="alert">Masukkan durasi dan jumlah yang valid, maksimal {available} unit.</p>}
    {valid && estimate.requestKey === requestKey && estimate.error && <CollectionError message={estimate.error} retry={() => setAttempt(a => a + 1)} />}
    {submitError && <p className="rt-invalid" role="alert">{submitError}</p>}
    <button className="rt-primary rt-add" disabled={!ready} type="submit"><ShoppingBag size={17} /> Tambah ke tas sewa</button>
    {(notice || inBag > 0) && <div className="rt-added" role="status"><span><Check size={15} /> {notice || inBag + ' item di tas sewa.'}</span><Link to="/cart" className="rt-text-link">Lihat tas <ArrowRight size={14} /></Link></div>}
  </form>
}

export function ProductDetails() {
  const { id } = useParams()
  const resource = useResource('/clothings/' + encodeURIComponent(id))
  const product = resource.data
  const category = product && clothingTypes[product.type]
  return <main className="rt-frame rt-details">
    <nav className="rt-crumbs" aria-label="Jejak halaman">
      <Link to="/">Beranda</Link><ChevronRight /><Link to="/catalog">Koleksi</Link><ChevronRight /><span>{product?.name || 'Detail pakaian'}</span>
    </nav>
    {resource.error && <CollectionError message={resource.error} retry={resource.retry} />}
    {resource.loading && <div className="rt-detail-loading" role="status">Memuat detail pakaian…</div>}
    {product && <div className="rt-detail-grid">
      <div className="rt-detail-photo"><ProductImage product={product} eager /></div>
      <div className="rt-detail-info">
        <Link className="rt-type-link" to={'/catalog?type=' + product.type}>{category?.label}</Link>
        <h1>{product.name}</h1>
        <div className="rt-detail-price">{rupiah(product.rental_price_per_day)} <small>/ hari</small></div>
        <p className="rt-description">{product.description}</p>
        <div className="rt-stock"><Availability stock={product.stock} /><span>{product.stock} unit</span></div>
        <dl className="rt-attributes">
          <div><dt>Ukuran</dt><dd>{product.size}</dd></div>
          <div><dt>Warna</dt><dd>{product.color}</dd></div>
          <div><dt>Kondisi</dt><dd>{product.condition}</dd></div>
          {product.type === 'DRESS' && <div><dt>Model</dt><dd>{product.dress_style || '—'}</dd></div>}
          {product.type === 'SUIT' && <div><dt>Biaya cuci per unit</dt><dd>{rupiah(product.dry_cleaning_fee || 0)}</dd></div>}
          {product.type === 'COSTUME' && <>
            <div><dt>Tema</dt><dd>{product.theme || '—'}</dd></div>
            <div><dt>Aksesori per unit</dt><dd>{rupiah(product.accessory_fee || 0)}</dd></div>
          </>}
        </dl>
        <RentalOptions key={product.id} product={product} />
      </div>
    </div>}
  </main>
}
