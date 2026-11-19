import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { api, rupiah } from '../../shared.jsx';
import { dateText, Dialog, Empty, Field, FormActions, Heading, label, Load, matches, Photo, rentalCode, SearchBox, Status, Table, today, useResource } from './ui.jsx';

function RentalItems({ items }) {
  return <ul className="adm-items">{items.map(item => <li key={item.clothing_id}>
    <Photo src={item.image_url}/><div><strong>{item.name}</strong><small>{item.quantity} unit · {item.rental_days} hari · Ukuran {item.size}</small></div><b>{rupiah(item.subtotal)}</b>
  </li>)}</ul>;
}
function ReturnForm({ rental, busy, setBusy, close, saved }) {
  const [date, setDate] = useState(today());
  const [error, setError] = useState('');
  const lateDays = date ? Math.max(0, (Date.parse(date) - Date.parse(rental.planned_return_date)) / 86400000) : 0;
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      await api('/rentals/' + rental.id + '/return', {method:'POST', body});
      toast.success('Pengembalian dicatat dan stok dipulihkan.');
      saved();
    } catch (err) { setError(err.message); setBusy(false); }
  }
  return <form onSubmit={submit}>
    <div className="adm-fields"><Field name="Tanggal kembali aktual"><input type="date" name="return_date" min={rental.rental_date} value={date} required onChange={e => setDate(e.target.value)}/></Field>
      <Field name="Kondisi saat kembali"><input name="condition_on_return" required placeholder="Contoh: Baik"/></Field>
      <Field name="Catatan pengembalian" wide><textarea name="notes" rows={2} required placeholder="Catat kelengkapan dan kondisi pakaian."/></Field></div>
    <div className="adm-summaryline"><span>Keterlambatan <small>{lateDays} hari × {rupiah(10000)}</small></span><strong>{rupiah(lateDays * 10000)}</strong></div>
    {error && <p className="adm-error" role="alert">{error}</p>}
    <FormActions busy={busy} close={close} text="Konfirmasi pengembalian"/>
  </form>;
}
function ReturnRecord({ id }) {
  const record = useResource('/rentals/' + id + '/return');
  return <Load resource={record}>{data => <div className="adm-return-record"><h3>Catatan pengembalian</h3><dl className="adm-dl">
    <div><dt>Tanggal kembali</dt><dd>{dateText(data.return_date)}</dd></div><div><dt>Kondisi</dt><dd>{data.condition_on_return}</dd></div>
  </dl><p>{data.notes}</p></div>}</Load>;
}
function RentalDialog({ id, processing, close, saved }) {
  const rental = useResource('/rentals/' + id);
  const [busy, setBusy] = useState(false);
  return <Dialog title={(processing ? 'Pengembalian ' : 'Detail penyewaan ') + rentalCode(id)} close={close} busy={busy}>
    <Load resource={rental}>{r => <>
      <div className="adm-rental-customer"><div><strong>{r.customer_name}</strong><small>{r.customer?.email}</small></div><Status value={r.status}/></div>
      <dl className="adm-dl"><div><dt>Tanggal sewa</dt><dd>{dateText(r.rental_date)}</dd></div><div><dt>Rencana kembali</dt><dd>{dateText(r.planned_return_date)}</dd></div></dl>
      <RentalItems items={r.items}/>
      {processing && r.status === 'RENTED' ? <ReturnForm rental={r} busy={busy} setBusy={setBusy} close={close} saved={saved}/> : <>
        <dl className="adm-totals"><div><dt>Total sewa</dt><dd>{rupiah(r.total_price)}</dd></div><div><dt>Denda pengembalian</dt><dd>{rupiah(r.return_fee)}</dd></div>
          <div><dt>Dibayar</dt><dd>{rupiah(r.paid_amount)}</dd></div><div><dt>Sisa tagihan</dt><dd>{rupiah(r.outstanding_amount)}</dd></div></dl>
        {r.payments?.length > 0 && <div className="adm-return-record"><h3>Pembayaran</h3><ul className="adm-payments">{r.payments.map(p => <li key={p.id}>
          <span>{label(p.payment_method)}<small>{dateText(p.payment_date)}</small></span><strong>{rupiah(p.amount)}</strong></li>)}</ul></div>}
        {r.status === 'RETURNED' && <ReturnRecord id={r.id}/>}
        <div className="adm-form-actions"><Link className="adm-btn" to={'/rentals/'+r.id+'/invoice'}>Lihat faktur <ArrowUpRight size={14}/></Link>
          {r.status === 'RENTED' && <Link className="adm-btn adm-primary" to={'/admin/returns/'+r.id}><RotateCcw size={15}/>Proses kembali</Link>}</div>
      </>}
    </>}</Load>
  </Dialog>;
}
export default function Rentals({ returns = false }) {
  const resource = useResource('/rentals');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(returns ? 'RENTED' : '');
  const { id } = useParams();
  const navigate = useNavigate();
  const base = returns ? '/admin/returns' : '/admin/rentals';
  function close() { navigate(base, { replace:true }); }
  return <>
    <Heading title={returns ? 'Pengembalian' : 'Penyewaan'}>{returns ? 'Periksa pakaian yang kembali dan catat denda keterlambatan.' : 'Telusuri transaksi, pembayaran, dan jadwal pengembalian pelanggan.'}</Heading>
    <section className="adm-panel"><div className="adm-tools"><SearchBox value={query} onChange={setQuery} placeholder="Cari pelanggan atau ID sewa…"/>
      <select aria-label="Filter status sewa" value={status} onChange={e => setStatus(e.target.value)}>
        <option value="">Semua status</option><option value="RENTED">{returns ? 'Perlu dikembalikan' : 'Disewa'}</option><option value="RETURNED">Dikembalikan</option>
      </select></div>
      <Load resource={resource}>{data => {
        const rows = data.filter(r => (!status || r.status === status) && matches(query,r.customer_name,rentalCode(r.id)));
        if (!rows.length) return <Empty title={data.length ? 'Tidak ada transaksi yang cocok' : 'Belum ada penyewaan'}>{data.length ? 'Coba ubah pencarian atau status.' : 'Transaksi akan muncul setelah pelanggan menyewa pakaian.'}</Empty>;
        return <Table caption={returns ? 'Daftar pengembalian' : 'Daftar penyewaan'} headers={['ID / pelanggan','Tanggal sewa','Rencana kembali','Total / sisa','Pembayaran','Status','Aksi']}>{rows.map(r => <tr key={r.id}>
          <td><Link to={'/admin/rentals/'+r.id} className="adm-id">{rentalCode(r.id)}</Link><small>{r.customer_name}</small></td>
          <td>{dateText(r.rental_date)}</td><td>{dateText(r.planned_return_date)}{r.status === 'RENTED' && r.planned_return_date < today() && <small className="adm-overdue">Terlambat</small>}</td>
          <td>{rupiah(r.total_price)}<small>Sisa {rupiah(r.outstanding_amount)}</small></td><td><Status value={r.payment_status}/></td><td><Status value={r.status}/></td>
          <td>{r.status === 'RENTED' ? <Link className="adm-row-link" to={'/admin/returns/'+r.id}>Proses kembali</Link> : <Link className="adm-row-link" to={'/admin/rentals/'+r.id}>Detail</Link>}</td>
        </tr>)}</Table>;
      }}</Load>
    </section>
    {id && <RentalDialog key={id + '-' + returns} id={id} processing={returns} close={close} saved={() => {close(); resource.reload();}}/>}
  </>;
}
