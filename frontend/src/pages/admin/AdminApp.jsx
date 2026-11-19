import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowUpRight, BookOpen, ChevronRight, ClipboardList, LayoutDashboard, PanelLeft, RotateCcw, Shirt, Users } from 'lucide-react';
import { useSession } from '../../shared.jsx';
import Dashboard from './Dashboard.jsx';
import Inventory from './Inventory.jsx';
import Rentals from './Rentals.jsx';
import { Customers, Logs } from './Directories.jsx';
import './admin.css';

const pages = [
  ['', 'Ringkasan', LayoutDashboard], ['inventory', 'Inventaris', Shirt], ['rentals', 'Penyewaan', ClipboardList],
  ['returns', 'Pengembalian', RotateCcw], ['customers', 'Pelanggan', Users], ['inventory-logs', 'Riwayat stok', BookOpen],
];
export default function AdminApp() {
  const { user } = useSession();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const path = location.pathname.split('/')[2] || '';
  const title = pages.find(page => page[0] === path)?.[1] || 'Ringkasan';
  const initials = (user?.name || 'Admin').split(/\s+/).slice(0, 2).map(s => s[0]).join('');
  useEffect(() => { setMobileNav(false); }, [location.pathname]);
  return <div className={'adm-shell' + (collapsed ? ' adm-collapsed' : '') + (mobileNav ? ' adm-mobile-open' : '')}>
    <aside className="adm-sidebar">
      <Link to="/admin" className="adm-wordmark" aria-label="Rentique Admin"><span>rentique.</span><b>r.</b></Link>
      <div className="adm-nav-label">Ruang kerja</div>
      <nav id="adm-navigation" aria-label="Navigasi admin">
        {pages.map(([slug, text, Icon]) => <NavLink key={slug} to={slug ? '/admin/' + slug : '/admin'} end={!slug} className={({ isActive }) => 'adm-nav-link' + (isActive ? ' selected' : '')} title={text}>
          <Icon size={19} strokeWidth={1.6}/><span>{text}</span></NavLink>)}
      </nav>
      <div className="adm-side-foot"><Link to="/" className="adm-store-link" title="Lihat etalase"><ArrowUpRight size={18}/><span>Lihat etalase</span></Link>
        <Link to="/profile" className="adm-account" title="Profil administrator"><span className="adm-avatar">{initials}</span><span><strong>{user?.name}</strong><small>Administrator</small></span></Link>
      </div>
    </aside>
    <div className="adm-main">
      <header className="adm-top"><button type="button" className="adm-icon adm-desktop-toggle" aria-label={collapsed ? 'Perluas navigasi' : 'Ringkas navigasi'} aria-expanded={!collapsed} aria-controls="adm-navigation" onClick={() => setCollapsed(!collapsed)}><PanelLeft size={18}/></button>
        <button type="button" className="adm-icon adm-mobile-toggle" aria-label={mobileNav ? 'Tutup navigasi' : 'Buka navigasi'} aria-expanded={mobileNav} aria-controls="adm-navigation" onClick={() => setMobileNav(!mobileNav)}><PanelLeft size={20}/></button>
        <span className="adm-divider"/><Link to="/admin">Admin</Link><ChevronRight size={13}/><span>{title}</span>
      </header>
      <main className="adm-content"><Routes>
        <Route index element={<Dashboard/>}/><Route path="inventory" element={<Inventory/>}/>
        <Route path="rentals" element={<Rentals key="rentals"/>}/><Route path="rentals/:id" element={<Rentals key="rentals"/>}/>
        <Route path="returns" element={<Rentals key="returns" returns/>}/><Route path="returns/:id" element={<Rentals key="returns" returns/>}/>
        <Route path="customers" element={<Customers/>}/><Route path="inventory-logs" element={<Logs/>}/>
        <Route path="*" element={<Navigate to="/admin" replace/>}/>
      </Routes></main>
    </div>
  </div>;
}
