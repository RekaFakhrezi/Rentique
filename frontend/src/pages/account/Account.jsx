import React,{useState} from 'react'
import {Link,Navigate,useNavigate,useSearchParams} from 'react-router-dom'
import {ArrowRight,LogOut} from 'lucide-react'
import {toast} from 'sonner'
import {api,useSession} from '../../shared.jsx'

export function Login(){
  const session=useSession(), [params]=useSearchParams(), navigate=useNavigate()
  const [email,setEmail]=useState(''),[password,setPassword]=useState('')
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  function destination(user) {
    const next=params.get('next')
    if (next?.startsWith('/') && !next.startsWith('//') && !next.includes('\\') && (user.role==='ADMIN'||!next.startsWith('/admin'))) return next
    return user.role==='ADMIN'?'/admin':'/rentals'
  }
  if (session.user) return <Navigate replace to={destination(session.user)}/>
  async function submit(e){
    e.preventDefault(); if(busy)return
    setBusy(true);setError('')
    try{
      const user=await api('/auth/login',{method:'POST',body:{email,password}})
      session.setUser(user);toast.success('Berhasil masuk');navigate(destination(user),{replace:true})
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }
  return <main className="ac-page ac-login"><div className="ac-login-photo"><img src="/images/hero.webp" alt="Gaun malam koleksi Rentique"/></div>
    <section className="ac-login-form"><h1>Selamat datang.</h1><p>Masuk ke akun Rentique untuk melanjutkan.</p>
      <form onSubmit={submit}><label>Email<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>Kata sandi<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
        {error&&<p className="ac-error" role="alert">{error}</p>}<button className="ac-btn" disabled={busy}>{busy?'Memeriksa…':'Masuk'} <ArrowRight size={17}/></button>
      </form><div className="ac-demo"><span>Isi akun demo</span>{[['Pelanggan','customer@rentique.test','Customer123!'],['Admin','admin@rentique.test','Admin123!']].map(([label,mail,pw])=><button key={mail} type="button" onClick={()=>{setEmail(mail);setPassword(pw)}}>{label}</button>)}</div>
    </section></main>
}

export function Profile(){
  const {user,setUser,logout}=useSession(),navigate=useNavigate()
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  async function save(e) {
    e.preventDefault();if(busy)return
    const body=Object.fromEntries(new FormData(e.currentTarget))
    setBusy(true);setError('')
    try{setUser(await api('/auth/profile',{method:'PATCH',body}));toast.success('Profil tersimpan')}
    catch(err){setError(err.message)}finally{setBusy(false)}
  }
  async function exit(){setBusy(true);try{await logout();navigate('/')}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <main className="ac-page ac-narrow"><h1>Profil saya</h1><p className="ac-sub">Kelola informasi kontak untuk sewaanmu.</p>
    <form className="ac-panel" onSubmit={save}>{[['name','Nama','text'],['email','Email','email'],['phone','Nomor telepon','tel']].map(([key,label,type])=>
      <label key={key}>{label}<input name={key} type={type} required={key!=='phone'} defaultValue={user[key]} /></label>)}
      <label>Alamat<textarea name="address" rows="3" defaultValue={user.address}/></label>
      {error&&<p className="ac-error" role="alert">{error}</p>}
      <button className="ac-btn" disabled={busy}>Simpan perubahan</button></form>
    <div className="ac-actions"><Link to={user.role==='ADMIN'?'/admin':'/rentals'}>{user.role==='ADMIN'?'Buka dasbor':'Lihat sewaan saya'}</Link><button className="ac-link" disabled={busy} onClick={exit}><LogOut size={15}/> Keluar</button></div></main>
}
