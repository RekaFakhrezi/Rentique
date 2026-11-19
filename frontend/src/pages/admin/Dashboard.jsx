import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, CircleDollarSign, Clock3, Package, Shirt } from 'lucide-react';
import { rupiah } from '../../shared.jsx';
import { dateText, Empty, Heading, Load, Photo, rentalCode, Status, Table, today, useResource } from './ui.jsx';

export default function Dashboard() {
  const report = useResource('/admin/dashboard');
  return <>
    <Heading title="Ringkasan" action={<span className="adm-date"><CalendarDays size={16}/>{dateText(today())}</span>}>Pantau stok, transaksi, dan pendapatan rental.</Heading>
    <Load resource={report}>{data => <>
      <div className="adm-kpis">{[
        ['Produk aktif', data.total_products, Shirt, 'Inventaris'],
        ['Penyewaan aktif', data.active_rentals, Package, 'Sedang dipinjam'],
        ['Pendapatan', rupiah(data.revenue), CircleDollarSign, 'Pembayaran berhasil'],
        ['Lewat jatuh tempo', data.overdue_rentals, Clock3, 'Belum dikembalikan'],
      ].map(([name, value, Icon, hint]) => <div className="adm-kpi" key={name}><div><span>{name}</span><Icon size={17} strokeWidth={1.6}/></div><strong>{value}</strong><small>{hint}</small></div>)}</div>
      <section className="adm-panel"><div className="adm-panel-title"><h2>Penyewaan terbaru</h2><Link className="adm-text-link" to="/admin/rentals">Lihat semua <ArrowUpRight size={15}/></Link></div>
        {data.recent_rentals.length ? <Table caption="Penyewaan terbaru" headers={['ID sewa','Pelanggan','Total sewa','Pembayaran','Status']}>
          {data.recent_rentals.map(r => <tr key={r.id}><td><Link className="adm-id" to={'/admin/rentals/'+r.id}>{rentalCode(r.id)}</Link></td><td>{r.customer_name}</td><td>{rupiah(r.total_price)}</td><td><Status value={r.payment_status}/></td><td><Status value={r.status}/></td></tr>)}
        </Table> : <Empty title="Belum ada transaksi">Transaksi akan muncul saat pelanggan membuat penyewaan.</Empty>}
      </section>
      <div className="adm-dashboard-bottom">
        <section className="adm-panel"><div className="adm-panel-title"><h2>Stok menipis</h2><Link to="/admin/inventory" className="adm-text-link">Inventaris <ArrowUpRight size={15}/></Link></div>
          {data.low_stock_items.length ? <ul className="adm-low-stock">{data.low_stock_items.map(c => <li key={c.id}>
            <Photo src={c.image_url}/><Link to={'/admin/inventory?product='+c.id}>{c.name}<small>Ukuran {c.size}</small></Link><span className="adm-units">{c.stock} unit</span>
          </li>)}</ul> : <Empty title="Stok mencukupi">Belum ada produk dengan stok menipis.</Empty>}
        </section>
        <section className="adm-panel"><div className="adm-panel-title"><h2>Operasional rental</h2></div>
          <dl className="adm-operations"><div><dt>Unit tersedia</dt><dd>{data.available_units}</dd></div><div><dt>Penyewaan selesai</dt><dd>{data.returned_rentals}</dd></div><div><dt>Sisa tagihan pelanggan</dt><dd>{rupiah(data.outstanding_payments)}</dd></div></dl>
        </section>
      </div>
    </>}</Load>
  </>;
}
