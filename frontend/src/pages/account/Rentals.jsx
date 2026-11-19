import React,{useState} from 'react'
import {Link,useLocation,useParams} from 'react-router-dom'
import {Printer,ReceiptText} from 'lucide-react'
import {toast} from 'sonner'
import {api,rupiah,dateLabel,requestKey,useLoad,useSession} from '../../shared.jsx'
import {LoadState} from './Checkout.jsx'
import {PaymentForm} from './Payment.jsx'

const statusText={DRAFT:'Draf',RENTED:'Sedang disewa',RETURNED:'Dikembalikan',PAID:'Lunas',PARTIALLY_PAID:'Dibayar sebagian',UNPAID:'Belum dibayar'}
const methodText={CASH:'Tunai',TRANSFER:'Transfer bank',EWALLET:'Dompet digital'}
function Status({value}){return <span className={'ac-badge ac-'+value}>{statusText[value]||value}</span>}
function ReceiptLines({data}){return <div className="ac-table-wrap"><table className="ac-table"><thead><tr><th>Pakaian</th><th>Jumlah</th><th>Hari</th><th>Tarif/hari</th><th>Biaya tambahan</th><th>Subtotal</th></tr></thead><tbody>{data.items.map(i=><tr key={i.clothing_id}><td>{i.name}</td><td>{i.quantity}</td><td>{i.rental_days}</td><td>{rupiah(i.price_per_day)}</td><td>{rupiah(i.additional_fee)}</td><td>{rupiah(i.subtotal)}</td></tr>)}</tbody></table></div>}
function Totals({data}){return <dl className="ac-totals"><div><dt>Total sewa</dt><dd>{rupiah(data.total_price)}</dd></div><div><dt>Denda pengembalian</dt><dd>{rupiah(data.return_fee)}</dd></div><div><dt>Sudah dibayar</dt><dd>{rupiah(data.paid_amount)}</dd></div><div className="ac-total"><dt>Sisa tagihan</dt><dd>{rupiah(data.outstanding_amount)}</dd></div></dl>}
function Payments({rows}){return <div><h2>Riwayat pembayaran</h2>{rows.length===0?<p>Belum ada pembayaran.</p>:<ul className="ac-payments">{rows.map(p=><li key={p.id}><div><b>{methodText[p.payment_method]} {p.bank_name||p.provider||''}</b><small>{dateLabel(p.payment_date)}</small>{p.payment_method==='CASH'&&<small>Diterima {rupiah(p.cash_received)} · Kembalian {rupiah(p.change_amount)}</small>}</div><strong>{rupiah(p.amount)}</strong></li>)}</ul>}</div>}
export function MyRentals(){
  const list=useLoad(()=>api('/rentals'),'rentals'), [filter,setFilter]=useState('')
  const rows=(list.data||[]).filter(r=>!filter||r.status===filter)
  return <main className="ac-page"><h1>Sewaan saya</h1><p className="ac-sub">Pantau tanggal kembali, pembayaran, dan invoice sewaanmu.</p>
    <div className="ac-tabs">{[['','Semua'],['RENTED','Aktif'],['RETURNED','Dikembalikan']].map(([v,l])=><button key={v} aria-pressed={filter===v} onClick={()=>setFilter(v)}>{l}</button>)}</div>
    <LoadState state={list}/>{list.data&&(!rows.length?<div className="ac-empty"><ReceiptText/><h2>Belum ada sewaan{filter?' dalam daftar ini':''}</h2><Link to="/catalog" className="ac-btn">Jelajahi koleksi</Link></div>:
      <div className="ac-list">{rows.map(r=><article key={r.id} className="ac-rental"><div><h2>Sewa #{r.id}</h2><p>{dateLabel(r.rental_date)} — {dateLabel(r.planned_return_date)}</p><div><Status value={r.status}/><Status value={r.payment_status}/></div></div>
        <div><p>Total {rupiah(r.total_price)}</p><b>Sisa {rupiah(r.outstanding_amount)}</b></div>
        <div className="ac-row-links"><Link to={'/rentals/'+r.id}>Lihat detail</Link>{Number(r.outstanding_amount)>0&&<Link to={'/rentals/'+r.id+'#bayar'}>Bayar sisa tagihan</Link>}<Link to={'/rentals/'+r.id+'/invoice'}>Lihat invoice</Link></div></article>)}</div>)}</main>
}
export function RentalDetails(){
  const {id}=useParams(),{state}=useLocation(),{user}=useSession()
  const result=useLoad(()=>api('/rentals/'+id+'/invoice'),id),data=result.data
  async function pay(body){
    const storageKey='rentique.payment.'+user.id+'.'+id
    const signature=JSON.stringify([Number(data.paid_amount),body])
    let pending
    try{pending=JSON.parse(sessionStorage.getItem(storageKey))}catch{}
    if(pending?.signature!==signature){pending={signature,key:requestKey()};sessionStorage.setItem(storageKey,JSON.stringify(pending))}
    await api('/rentals/'+id+'/payments',{method:'POST',body,headers:{'Idempotency-Key':pending.key}})
    sessionStorage.removeItem(storageKey);toast.success('Pembayaran tercatat');result.retry()
  }
  return <main className="ac-page"><Link className="ac-back" to={user.role==='ADMIN'?'/admin/rentals':'/rentals'}>← Daftar sewa</Link><h1>Detail sewa #{id}</h1>
    {state?.notice&&<p className="ac-status" role="status">{state.notice}</p>}<LoadState state={result}/>{data&&<div className="ac-split"><section className="ac-panel"><div><Status value={data.status}/><Status value={data.payment_status}/></div>
      <p>Disewa {dateLabel(data.rental_date)} · Kembali paling lambat {dateLabel(data.planned_return_date)}</p>{data.actual_return_date&&<p>Dikembalikan {dateLabel(data.actual_return_date)}</p>}
      <ReceiptLines data={data}/><Totals data={data}/><Link className="ac-link" to={'/rentals/'+id+'/invoice'}>Lihat invoice</Link><hr/><Payments rows={data.payments}/></section>
      {Number(data.outstanding_amount)>0&&<aside id="bayar" className="ac-panel"><PaymentForm balance={data.outstanding_amount} onSubmit={pay}/></aside>}</div>}</main>
}
export function Invoice(){
  const {id}=useParams(),result=useLoad(()=>api('/rentals/'+id+'/invoice'),id),d=result.data
  return <main className="ac-page ac-invoice-page"><div className="ac-invoice-actions"><Link to={'/rentals/'+id}>← Detail sewa</Link><button className="ac-btn" onClick={()=>window.print()} disabled={!d}><Printer size={16}/> Cetak invoice</button></div><LoadState state={result}/>
    {d&&<article className="ac-invoice"><header><span className="ac-wordmark">rentique.</span><div><h1>Invoice</h1><span>{d.invoice_number}</span></div></header>
      <div className="ac-invoice-meta"><div><small>Penyewa</small><b>{d.customer?.name||d.customer_name}</b><p>{d.customer?.email}<br/>{d.customer?.phone}<br/>{d.customer?.address}</p></div>
        <div><small>Tanggal terbit</small><b>{dateLabel(d.issue_date)}</b><small>Periode sewa</small><p>{dateLabel(d.rental_date)} — {dateLabel(d.planned_return_date)}</p></div></div>
      <div className="ac-invoice-status"><Status value={d.status}/><Status value={d.payment_status}/></div>
      <ReceiptLines data={d}/><Totals data={d}/><hr/><Payments rows={d.payments}/><footer>Rentique · Bukti transaksi simulasi #{d.id}</footer>
    </article>}</main>
}
