import React from 'react'
import {Navigate,Outlet,Route,Routes,useLocation,Link} from 'react-router-dom'
import {useSession} from './shared.jsx'
import {CustomerLayout,Home,Catalog,ProductDetails} from './pages/storefront/Storefront.jsx'
import AdminApp from './pages/admin/AdminApp.jsx'
import {Login,Profile} from './pages/account/Account.jsx'
import {Bag,Checkout} from './pages/account/Checkout.jsx'
import {MyRentals,RentalDetails,Invoice} from './pages/account/Rentals.jsx'
import './pages/account/account.css'

function Guard({role}) {
  const {user,loading,error,refresh}=useSession()
  const here=useLocation()
  if (loading) return <p className="ac-status" role="status">Memeriksa sesi…</p>
  if (error) return <div className="ac-status" role="alert">{error} <button onClick={()=>refresh().catch(()=>{})}>Coba lagi</button></div>
  if (!user) return <Navigate replace to={'/login?next='+encodeURIComponent(here.pathname+here.search)}/>
  if (role && user.role!==role) return <Navigate replace to={user.role==='ADMIN'?'/admin':'/rentals'}/>
  return <Outlet/>
}
export default function App(){
  return <Routes>
    <Route element={<CustomerLayout/>}>
      <Route index element={<Home/>}/><Route path="catalog" element={<Catalog/>}/><Route path="clothing/:id" element={<ProductDetails/>}/>
      <Route path="cart" element={<Bag/>}/><Route path="login" element={<Login/>}/>
      <Route element={<Guard/>}><Route path="profile" element={<Profile/>}/><Route path="rentals/:id/invoice" element={<Invoice/>}/><Route path="rentals/:id" element={<RentalDetails/>}/></Route>
      <Route element={<Guard role="CUSTOMER"/>}><Route path="checkout" element={<Checkout/>}/><Route path="rentals" element={<MyRentals/>}/></Route>
      <Route path="*" element={<div className="ac-page"><h1>Halaman tidak ditemukan</h1><Link className="ac-btn" to="/catalog">Jelajahi koleksi</Link></div>}/>
    </Route>
    <Route element={<Guard role="ADMIN"/>}><Route path="/admin/*" element={<AdminApp/>}/></Route>
  </Routes>
}
