import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Menu, ShoppingBag, UserRound, X } from 'lucide-react'
import { useBag, useSession } from '../../shared.jsx'
import { clothingTypes, CollectionError, ProductGrid, useResource } from './Collection.jsx'
import './storefront.css'

export { Catalog } from './Catalog.jsx'
export { ProductDetails } from './ProductDetails.jsx'

function Wordmark() {
  return <Link className="rt-wordmark" to="/" aria-label="Rentique, beranda">rentique<span>.</span></Link>
}

export function CustomerLayout() {
  const { user } = useSession()
  const { count } = useBag()
  const [open, setOpen] = useState(false)
  const toggle = useRef(null)
  const location = useLocation()
  const guide = location.pathname === '/' && location.hash === '#cara-sewa'
  useEffect(() => {
    setOpen(false)
    if (location.hash === '#cara-sewa') document.getElementById('cara-sewa')?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [location.pathname, location.hash])
  useEffect(() => {
    if (!open) return
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        toggle.current?.focus()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])
  return <div className="rentique-store">
    <a href="#konten-utama" className="rt-skip">Langsung ke konten</a>
    <header className="rt-site-header">
      <div className="rt-frame rt-header-inner">
        <button type="button" className="rt-menu-button rt-icon-button" ref={toggle} aria-label={open ? 'Tutup navigasi' : 'Buka navigasi'}
          aria-expanded={open} aria-controls="rt-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        <Wordmark />
        <nav id="rt-navigation" className={'rt-nav' + (open ? ' rt-nav-open' : '')} aria-label="Menu utama" onClick={() => setOpen(false)}>
          <NavLink end to="/" className={({ isActive }) => isActive && !guide ? 'rt-nav-active' : ''}>Beranda</NavLink>
          <NavLink to="/catalog" className={() => /^\/(catalog|clothing)(\/|$)/.test(location.pathname) ? 'rt-nav-active' : ''}>Koleksi</NavLink>
          <Link to="/#cara-sewa" className={guide ? 'rt-nav-active' : ''} onClick={() => document.getElementById('cara-sewa')?.scrollIntoView()}>Cara sewa</Link>
          {user && <NavLink to={user.role === 'ADMIN' ? '/admin' : '/rentals'} className={({ isActive }) => isActive ? 'rt-nav-active' : ''}>{user.role === 'ADMIN' ? 'Dasbor' : 'Sewaan saya'}</NavLink>}
        </nav>
        <div className="rt-nav-actions">
          <Link to={user ? '/profile' : '/login'} className="rt-account" aria-label={user ? 'Buka profil' : 'Masuk'}>
            <UserRound size={18} strokeWidth={1.5} /><span>{user ? 'Profil' : 'Masuk'}</span>
          </Link>
          <Link className="rt-nav-bag" to="/cart" aria-label={'Tas sewa, ' + count + ' item'}>
            <ShoppingBag size={21} strokeWidth={1.5} />{count > 0 && <span className="rt-count">{count}</span>}
          </Link>
        </div>
      </div>
    </header>
    <div id="konten-utama" tabIndex="-1"><Outlet /></div>
    <footer className="rt-site-footer">
      <div className="rt-frame rt-footer-inner">
        <Wordmark />
        <nav aria-label="Menu bawah"><Link to="/catalog">Koleksi</Link><Link to="/#cara-sewa">Cara sewa</Link><Link to="/cart">Tas sewa</Link></nav>
        <small>© {new Date().getFullYear()} Rentique</small>
      </div>
    </footer>
  </div>
}

const steps = [
  ['Temukan pilihanmu', 'Jelajahi koleksi dan masukkan pakaian yang kamu suka ke tas sewa.'],
  ['Tentukan durasi', 'Pilih jumlah hari, periksa rincian harga, lalu konfirmasi sewaanmu.'],
  ['Kenakan dan kembalikan', 'Nikmati acaramu dan kembalikan pakaian sesuai tanggal di invoice.'],
]

export function Home() {
  const products = useResource('/clothings')
  const list = Array.isArray(products.data) ? products.data : []
  // Showcase the three clothing types before filling the remaining space.
  const featured = [...new Set([...Object.keys(clothingTypes).map(type => list.find(p => p.type === type)), ...list])].filter(Boolean).slice(0, 4)
  return <main className="rt-home">
    <div className="rt-frame">
      <section className="rt-hero" aria-labelledby="rt-hero-heading">
        <div className="rt-hero-copy">
          <div className="rt-collection-label">The rental collection</div>
          <h1 id="rt-hero-heading">Dress for<br /><em>the moment.</em></h1>
          <p>Sewa gaun, jas, dan kostum pilihan untuk setiap momen istimewamu.</p>
          <Link className="rt-primary" to="/catalog">Jelajahi koleksi <ArrowRight size={17} /></Link>
        </div>
        <div className="rt-hero-visual">
          <img src="/images/hero.webp" alt="Model mengenakan gaun panjang berlipit dengan bahu terbuka" fetchPriority="high" />
        </div>
      </section>

      <section className="rt-section" aria-labelledby="rt-categories-heading">
        <div className="rt-section-heading">
          <h2 id="rt-categories-heading">Jelajahi per kategori</h2>
          <Link className="rt-text-link" to="/catalog">Lihat semua <ArrowUpRight size={16} /></Link>
        </div>
        <div className="rt-categories">
          {Object.entries(clothingTypes).map(([type, entry]) =>
            <Link key={type} to={'/catalog?type=' + type} className={'rt-category rt-category-' + type.toLowerCase()}>
              <img src={entry.image} alt="" loading="lazy" />
              <div className="rt-category-caption"><h3>{entry.label}</h3><span><ArrowUpRight size={20} strokeWidth={1.6} /></span></div>
            </Link>)}
        </div>
      </section>

      <section className="rt-section rt-featured" aria-labelledby="rt-featured-heading">
        <div className="rt-section-heading">
          <h2 id="rt-featured-heading">Pilihan Rentique</h2>
          <Link className="rt-text-link" to="/catalog">Lihat koleksi <ArrowUpRight size={16} /></Link>
        </div>
        {products.error ? <CollectionError message={products.error} retry={products.retry} />
          : !products.loading && !featured.length ? <div className="rt-feedback">Koleksi baru sedang disiapkan.</div>
          : <ProductGrid products={featured} loading={products.loading} />}
      </section>
    </div>
    <section className="rt-how" id="cara-sewa" aria-labelledby="rt-how-heading">
      <div className="rt-frame">
        <h2 id="rt-how-heading">Cara sewa</h2>
        <ol className="rt-steps">
          {steps.map(([title, body], index) => <li key={title}>
            <span className="rt-step-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <h3>{title}</h3><p>{body}</p>
          </li>)}
        </ol>
      </div>
    </section>
  </main>
}
