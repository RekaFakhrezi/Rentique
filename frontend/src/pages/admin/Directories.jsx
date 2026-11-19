import { useState } from 'react';
import { dateText, Empty, Heading, label, Load, matches, SearchBox, Table, useResource } from './ui.jsx';

export function Customers() {
  const resource = useResource('/admin/customers');
  const [query, setQuery] = useState('');
  return <>
    <Heading title="Pelanggan">Lihat kontak dan jumlah penyewaan setiap pelanggan.</Heading>
    <section className="adm-panel"><div className="adm-tools"><SearchBox value={query} onChange={setQuery} placeholder="Cari nama, email, atau telepon…"/></div>
      <Load resource={resource}>{data => {
        const rows = data.filter(r => matches(query,r.name,r.email,r.phone));
        return rows.length ? <Table caption="Daftar pelanggan" headers={['Pelanggan','Telepon','Alamat','Jumlah sewa']}>
          {rows.map(r => <tr key={r.id}><td><strong>{r.name}</strong><small>{r.email}</small></td><td>{r.phone || '—'}</td><td className="adm-wrap">{r.address || '—'}</td><td>{r.rental_count}</td></tr>)}
        </Table> : <Empty title="Pelanggan tidak ditemukan">{query ? 'Coba nama atau kontak lain.' : 'Akun pelanggan yang terdaftar akan muncul di sini.'}</Empty>;
      }}</Load></section>
  </>;
}
export function Logs() {
  const resource = useResource('/admin/inventory-logs');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  return <>
    <Heading title="Riwayat stok">Telusuri setiap perubahan jumlah pakaian dan penanggung jawabnya.</Heading>
    <section className="adm-panel"><div className="adm-tools"><SearchBox value={query} onChange={setQuery} placeholder="Cari pakaian, pelaku, atau catatan…"/>
      <select aria-label="Filter aktivitas stok" value={type} onChange={e => setType(e.target.value)}><option value="">Semua aktivitas</option>
        {['INITIAL','ADJUSTMENT','RENTAL','RETURN'].map(k => <option key={k} value={k}>{label(k)}</option>)}</select>
    </div><Load resource={resource}>{data => {
      const rows = data.filter(r => (!type || r.change_type === type) && matches(query,r.clothing_name,r.actor_name,r.notes));
      return rows.length ? <Table caption="Catatan perubahan stok" headers={['Waktu (WIB)','Pakaian','Aktivitas','Perubahan','Pelaku','Catatan']}>
        {rows.map(r => <tr key={r.id}><td>{dateText(r.created_at,true)}</td><td><strong>{r.clothing_name}</strong></td><td>{label(r.change_type)}</td><td><span className={'adm-quantity ' + (r.quantity_changed > 0 ? 'adm-positive' : '')}>{r.quantity_changed > 0 ? '+' : ''}{r.quantity_changed}</span></td><td>{r.actor_name || 'Sistem'}</td><td className="adm-wrap">{r.notes}</td></tr>)}
      </Table> : <Empty title="Tidak ada perubahan stok yang cocok">Periksa pencarian dan jenis aktivitas yang dipilih.</Empty>;
    }}</Load></section>
  </>;
}
