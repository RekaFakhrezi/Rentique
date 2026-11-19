import React,{useState} from 'react'
import {rupiah} from '../../shared.jsx'

export function PaymentForm({balance,onSubmit,action='Konfirmasi pembayaran',locked=false}){
  const [method,setMethod]=useState('TRANSFER'),[mode,setMode]=useState('full'),[partial,setPartial]=useState('')
  const [cash,setCash]=useState(''),[bank,setBank]=useState('BCA'),[provider,setProvider]=useState('DANA')
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  const amount=mode==='full'?Number(balance):Number(partial)
  const received=cash===''?amount:Number(cash)
  async function submit(e){
    e.preventDefault();if(busy||locked)return
    setBusy(true);setError('')
    try {
      await onSubmit({payment_method:method,amount,...(method==='CASH'?{cash_received:received}:method==='TRANSFER'?{bank_name:bank}:{provider})})
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }
  return <form className="ac-payment" onSubmit={submit}><h2>Pembayaran</h2>
    <p className="ac-note">Simulasi untuk demonstrasi. Tidak ada uang yang ditransfer.</p>
    {Number(balance)>0&&<><fieldset><legend>Jumlah pembayaran</legend><div className="ac-radios">{[['full','Bayar penuh'],['partial','Bayar sebagian']].map(([v,label])=><label key={v}><input type="radio" name="mode" checked={mode===v} onChange={()=>setMode(v)}/>{label}</label>)}</div></fieldset>
    {mode==='partial'&&<label>Nominal pembayaran (Rp)<input type="number" min="1" max={balance} step="1" required value={partial} onChange={e=>setPartial(e.target.value)}/></label>}
    <label>Metode pembayaran<select value={method} onChange={e=>setMethod(e.target.value)}><option value="TRANSFER">Transfer bank</option><option value="CASH">Tunai</option><option value="EWALLET">Dompet digital</option></select></label>
    {method==='CASH'?<><label>Uang diterima (Rp)<input type="number" min={Math.max(1,amount)} value={cash} placeholder={String(amount)} onChange={e=>setCash(e.target.value)}/></label>
      <p className="ac-line"><span>Kembalian</span><b>{rupiah(Math.max(0,received-amount))}</b></p></>:method==='TRANSFER'?<label>Bank<select value={bank} onChange={e=>setBank(e.target.value)}>{['BCA','BNI','BRI','Mandiri'].map(v=><option key={v}>{v}</option>)}</select></label>:<label>Penyedia<select value={provider} onChange={e=>setProvider(e.target.value)}>{['DANA','GoPay','OVO','ShopeePay'].map(v=><option key={v}>{v}</option>)}</select></label>}
    <p className="ac-line ac-total"><span>Dibayar sekarang</span><b>{rupiah(amount)}</b></p></>}
    {error&&<p className="ac-error" role="alert">{error}</p>}
    <button className="ac-btn" disabled={busy||locked}>{busy?'Memproses…':action}</button></form>
}
