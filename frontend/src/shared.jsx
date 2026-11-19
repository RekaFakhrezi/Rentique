import React, {createContext, useCallback, useContext, useEffect, useState} from 'react'

const SessionContext = createContext(null)
const BagContext = createContext(null)
export const useSession = () => useContext(SessionContext)
export const useBag = () => useContext(BagContext)
const currency = new Intl.NumberFormat('id-ID', {style:'currency',currency:'IDR',maximumFractionDigits:0})
export const rupiah = amount => currency.format(Number(amount ?? 0))
export const dateLabel = value => value ? new Intl.DateTimeFormat('id-ID', {day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date(value.length === 10 ? value+'T12:00:00+07:00' : value)) : '—'
export const jakartaToday = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Jakarta'}).format(new Date())
export const requestKey = () => crypto.randomUUID()

let csrf = ''
let handshake
async function request(path, options) {
  const {body, headers, ...rest} = options
  const response = await fetch('/api'+path, {
    credentials:'same-origin', ...rest,
    headers:{Accept:'application/json', ...(body !== undefined ? {'Content-Type':'application/json'} : {}),
      ...(csrf ? {'X-CSRF-Token':csrf} : {}), ...headers},
    body:body === undefined ? undefined : JSON.stringify(body),
  })
  csrf = response.headers.get('X-CSRF-Token') || csrf
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.success) {
    const error = new Error(result?.message || 'API tidak dapat dihubungi. Periksa koneksi server lalu coba lagi.')
    error.status = response.status
    throw error
  }
  return result.data
}
export async function api(path, options = {}) {
  if (!csrf) {
    handshake ??= request('/auth/me', {}).finally(() => { handshake = undefined })
    const user = await handshake
    if (path === '/auth/me') return user
  }
  return request(path, options)
}

function newBag() { return {items:[],days:1,key:requestKey()} }
function loadBag() {
  try {
    const saved = JSON.parse(localStorage.getItem('rentique.bag'))
    if (saved?.key && Number.isSafeInteger(saved.days) && saved.days > 0 && Array.isArray(saved.items) &&
      saved.items.every(i => Number.isSafeInteger(i.clothing_id) && i.clothing_id > 0 && Number.isSafeInteger(i.quantity) && i.quantity > 0)) return saved
  } catch {}
  return newBag()
}
export function Providers({children}) {
  const [user,setUser] = useState(null)
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [bag,setBag] = useState(loadBag)
  const refresh = useCallback(async () => {
    setError('')
    try { const found = await api('/auth/me'); setUser(found); return found }
    catch (e) { setError(e.message); throw e }
    finally { setLoading(false) }
  },[])
  useEffect(() => { refresh().catch(() => {}) }, [refresh])
  useEffect(() => { try { localStorage.setItem('rentique.bag',JSON.stringify(bag)) } catch {} },[bag])
  function update(edit) { setBag(previous => ({...edit(previous),key:requestKey()})) }
  const bagValue = {...bag, count:bag.items.reduce((n,i)=>n+i.quantity,0),
    add(id,quantity,days) {
      update(b => {
        const exists = b.items.some(i=>i.clothing_id===id)
        return {days,items:exists ? b.items.map(i=>i.clothing_id===id ? {...i,quantity:i.quantity+quantity}:i) : [...b.items,{clothing_id:id,quantity}]}
      })
    },
    setDays(days) { update(b=>({...b,days})) },
    setQuantity(id,quantity) { update(b=>({...b,items:b.items.map(i=>i.clothing_id===id?{...i,quantity}:i)})) },
    remove(id) { update(b=>({...b,items:b.items.filter(i=>i.clothing_id!==id)})) },
    clear() { setBag(newBag()) },
  }
  async function logout() { await api('/auth/logout',{method:'POST'}); setUser(null) }
  return <SessionContext.Provider value={{user,loading,error,refresh,logout,setUser}}>
    <BagContext.Provider value={bagValue}>{children}</BagContext.Provider>
  </SessionContext.Provider>
}

export function useLoad(load, dependency) {
  const [state,setState] = useState({loading:true})
  const [revision,setRevision] = useState(0)
  useEffect(() => {
    let alive = true
    setState({loading:true,dependency,revision})
    Promise.resolve().then(load).then(data => { if (alive) setState({data,dependency,revision}) },
      error => { if (alive) setState({error:error.message,dependency,revision}) })
    return () => { alive = false }
  },[dependency,revision])
  return {...(state.dependency === dependency && state.revision === revision ? state : {loading:true}),retry:()=>setRevision(n=>n+1)}
}
