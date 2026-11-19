import React from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {ArrowRight,ShoppingBag,Trash2} from 'lucide-react'
import {toast} from 'sonner'
import {api,dateLabel,rupiah,useBag,useSession,useLoad} from '../../shared.jsx'
import {ProductImage} from '../storefront/Collection.jsx'
import {PaymentForm} from './Payment.jsx'

function bagBody(bag){return {rental_days:bag.days,items:bag.items}}
function useQuote(bag) {
  return useLoad(()=>bag.items.length?api('/rentals/quote',{method:'POST',body:bagBody(bag)}):null,JSON.stringify(bagBody(bag)))
}
export function LoadState({state}){
  if(state.loading)return <div className="ac-status" role="status">Memuat data…</div>
  if(state.error)return <div className="ac-status ac-error" role="alert">{state.error} <button className="ac-link" onClick={state.retry}>Coba lagi</button></div>
  return null
}
function EmptyBag(){return <div className="ac-empty"><ShoppingBag strokeWidth={1}/><h2>Tas sewa masih kosong</h2><p>Pilih pakaian untuk acaramu dari koleksi Rentique.</p><Link to="/catalog" className="ac-btn">Jelajahi koleksi <ArrowRight size={16}/></Link></div>}
function Summary({quote}){
  const extras=quote.items.reduce((sum,i)=>sum+Number(i.additional_fee),0)
  return <div className="ac-summary"><h2>Ringkasan sewa</h2><dl>
    <div><dt>Tanggal sewa</dt><dd>{dateLabel(quote.rental_date)}</dd></div>
    <div><dt>Rencana kembali</dt><dd>{dateLabel(quote.planned_return_date)}</dd></div>
    <div><dt>Harga sewa ({quote.rental_days} hari)</dt><dd>{rupiah(quote.total_price-extras)}</dd></div>
    <div><dt>Biaya cuci & aksesori</dt><dd>{rupiah(extras)}</dd></div>
    <div className="ac-total"><dt>Total sewa</dt><dd>{rupiah(quote.total_price)}</dd></div></dl></div>
}
export function Bag(){
  const bag=useBag(),quote=useQuote(bag),products=useLoad(()=>api('/clothings'),'clothing')
  return <main className="ac-page"><h1>Tas sewa</h1>{!bag.items.length?<EmptyBag/>:<div className="ac-split"><section>
    <label className="ac-duration">Durasi semua pakaian (hari)<input aria-label="Durasi semua pakaian (hari)" type="number" min="1" step="1" value={bag.days} onChange={e=>{if(e.target.validity.valid&&e.target.valueAsNumber>0)bag.setDays(e.target.valueAsNumber)}}/></label>
    <LoadState state={products}/>{bag.items.map(item=>{
      const row=quote.data?.items.find(i=>Number(i.clothing_id)===item.clothing_id)
      const product=products.data?.find(i=>Number(i.id)===item.clothing_id)||row
      return <article className="ac-bag-item" key={item.clothing_id}>{product&&<div className="ac-thumb"><ProductImage product={product}/></div>}
        <div><Link to={'/clothing/'+item.clothing_id}><h3>{product?.name||('Pakaian #'+item.clothing_id)}</h3></Link>
        <p>{product?'Ukuran '+product.size:products.loading?'Memuat…':'Tidak tersedia'}</p>
        <label className="ac-qty">Jumlah<input aria-label={'Jumlah '+(product?.name||'pakaian')} type="number" step="1" min="1" value={item.quantity} onChange={e=>{if(e.target.validity.valid&&e.target.valueAsNumber>0)bag.setQuantity(item.clothing_id,e.target.valueAsNumber)}}/></label></div>
        <div className="ac-item-actions"><button type="button" aria-label={'Hapus '+(product?.name||'pakaian')} onClick={()=>bag.remove(item.clothing_id)}><Trash2 size={17}/></button>{row&&<b>{rupiah(row.subtotal)}</b>}</div></article>
    })}</section><aside className="ac-panel"><LoadState state={quote}/>{quote.data&&<><Summary quote={quote.data}/><Link to="/checkout" className="ac-btn">Lanjut checkout <ArrowRight size={16}/></Link></>}<p className="ac-note">Stok diperiksa kembali saat sewaan dibuat.</p></aside></div>}</main>
}
export function Checkout(){
  const bag=useBag(),{user}=useSession(),quote=useQuote(bag),navigate=useNavigate()
  async function place(payment){
    const order=await api('/rentals',{method:'POST',body:bagBody(bag),headers:{'Idempotency-Key':bag.key}})
    if (Number(order.total_price)!==Number(quote.data.total_price)){
      bag.clear();navigate('/rentals/'+order.id,{replace:true,state:{notice:'Harga berubah saat pemesanan. Periksa total sewaan sebelum membayar.'}});return
    }
    try {
      if(payment.amount>0)await api('/rentals/'+order.id+'/payments',{method:'POST',body:payment,headers:{'Idempotency-Key':bag.key+'-payment'}})
    } catch(e) {
      bag.clear();navigate('/rentals/'+order.id,{replace:true,state:{notice:'Sewaan sudah tersimpan. Periksa saldo dan riwayat pembayaran sebelum melanjutkan. '+e.message}});return
    }
    bag.clear();toast.success('Sewaan tersimpan');navigate('/rentals/'+order.id+'/invoice',{replace:true})
  }
  return <main className="ac-page"><Link className="ac-back" to="/cart">← Kembali ke tas</Link><h1>Checkout</h1>{!bag.items.length?<EmptyBag/>:<><LoadState state={quote}/>{quote.data&&<div className="ac-split"><section className="ac-panel"><h2>Informasi penyewa</h2><p>{user.name}<br/>{user.email}<br/>{user.phone}<br/>{user.address}</p><Link className="ac-link" to="/profile">Edit profil</Link>
      <hr/><PaymentForm balance={quote.data.total_price} onSubmit={place} action="Konfirmasi sewaan"/></section><aside className="ac-panel"><Summary quote={quote.data}/><hr/>{quote.data.items.map(item=><p key={item.clothing_id} className="ac-line"><span>{item.name} × {item.quantity}</span><b>{rupiah(item.subtotal)}</b></p>)}</aside></div>}</>}</main>
}
