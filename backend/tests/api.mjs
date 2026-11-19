// Run with Node 20+ and PHP_BIN=php against a PostgreSQL role that can create schemas.
import assert from 'node:assert/strict'
import {randomBytes,randomUUID} from 'node:crypto'
import {spawn,spawnSync} from 'node:child_process'
import {once} from 'node:events'
import {createServer} from 'node:net'
import {fileURLToPath} from 'node:url'
import {createInterface} from 'node:readline'
import {setTimeout as delay} from 'node:timers/promises'

const root=fileURLToPath(new URL('../../',import.meta.url))
const schema='rentique_test_'+randomBytes(12).toString('hex')
const env={...process.env,PGOPTIONS:'-c search_path='+schema}
const php=process.env.PHP_BIN || 'php'
function cli(...args) {
  const result=spawnSync(php,args,{cwd:root,env,encoding:'utf8'})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(result.stderr||result.stdout)
}
const probe=createServer()
probe.listen(0,'127.0.0.1')
await once(probe,'listening')
const port=probe.address().port
await new Promise(resolve=>probe.close(resolve))
const base='http://127.0.0.1:'+port+'/api'
let server, checks=0
async function start(){
  server=spawn(php,['-S','127.0.0.1:'+port,'-t','backend/public','backend/public/index.php'],{cwd:root,env,stdio:'ignore'})
  for(let i=0;i<80;i++){
    if(server.exitCode!==null)throw new Error('PHP server exited')
    try{if((await fetch(base+'/auth/me')).ok)return}catch{}
    await delay(100)
  }
  throw new Error('PHP server did not start')
}
async function stop(){if(server&&server.exitCode===null){const closed=once(server,'exit');server.kill();await closed}}
function client(){
  let cookie='',csrf=''
  return async(method,path,body,expected=200,extra={})=>{
    const r=await fetch(base+path,{method,headers:{Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body)})
    cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;csrf=r.headers.get('x-csrf-token')||csrf
    const response=await r.json()
    assert.ok((Array.isArray(expected)?expected:[expected]).includes(r.status),method+' '+path+' → '+r.status+' '+JSON.stringify(response))
    assert.equal(response.success,r.status<400);checks++
    return response.data
  }
}
const idempotent=()=>({'Idempotency-Key':randomUUID()})
const admin=client(),customer=client(),other=client(),guest=client()
async function login(call,email,password){await call('GET','/auth/me');return call('POST','/auth/login',{email,password})}
let prepared=false
// Separate PHP processes open independent PDO sessions before either request starts.
async function race(requests){
  const workers=requests.map(([email,command])=>{
    const child=spawn(php,['backend/tests/fixture.php','race',schema,email],{cwd:root,env,stdio:['pipe','pipe','inherit']})
    const lines=createInterface({input:child.stdout})[Symbol.asyncIterator]()
    return {child,lines,ready:lines.next(),command}
  })
  try{
    for(const worker of workers) assert.equal((await worker.ready).value,'ready')
    for(const worker of workers) worker.child.stdin.end(JSON.stringify(worker.command)+'\n')
    return await Promise.all(workers.map(async worker=>JSON.parse((await worker.lines.next()).value)))
  }finally{for(const worker of workers)worker.child.kill()}
}
try {
  cli('backend/tests/fixture.php','create',schema);prepared=true
  cli('database/seed.php');cli('database/seed.php')
  cli('backend/tests/fixture.php','customer',schema)
  await start()
  await guest('GET','/auth/me')
  await guest('GET','/admin/dashboard',undefined,401)
  await guest('POST','/auth/login',{email:'admin@rentique.test',password:'Admin123!'},403,{'X-CSRF-Token':'invalid'})
  await login(admin,'admin@rentique.test','Admin123!')
  await login(customer,'customer@rentique.test','Customer123!')
  await login(other,'other@rentique.test','Other123!')
  assert.equal((await customer('GET','/auth/me')).password_hash,undefined)
  await customer('GET','/admin/customers',undefined,403)
  const initial=await guest('GET','/clothings');assert.equal(initial.length,12)
  const filter=await guest('GET','/clothings?type=SUIT&sort=price_asc&search=Jas');assert.ok(filter.length&&filter.every(x=>x.type==='SUIT'))
  const first=await guest('GET','/clothings/1')
  const product={type:'DRESS',category_id:first.category_id,name:'Gaun Uji',size:'S',color:'Biru',rental_price_per_day:99000,stock:2,condition:'Baik',description:'Uji',dress_style:'A-Line',image_url:'/images/dress.webp'}
  await customer('POST','/clothings',product,403)
  const extra=await admin('POST','/clothings',product,201)
  await admin('PATCH','/clothings/'+extra.id,{name:'Gaun Uji Baru'})
  await admin('POST','/clothings/'+extra.id+'/adjust-stock',{quantity_changed:-5,notes:'Uji stok'},[409,422])
  await admin('DELETE','/clothings/'+extra.id)
  await guest('GET','/clothings/'+extra.id,undefined,404)
  await admin('POST','/clothings/1/adjust-stock',{quantity_changed:1,notes:'Penambahan satu jas'})
  const items=[1,2,3,4].map(id=>({clothing_id:id,quantity:id===3?2:1})),body={rental_days:2,items}
  const stock=async()=>Promise.all([1,2,3,4].map(async id=>Number((await guest('GET','/clothings/'+id)).stock)))
  const before=await stock()
  await customer('POST','/rentals',{rental_days:2,items:[items[0],{clothing_id:3,quantity:99}]},[409,422],idempotent())
  await guest('POST','/rentals/quote',{rental_days:0,items},422)
  await guest('POST','/rentals/quote',{rental_days:2,items:[{clothing_id:1,quantity:-1}]},422)
  assert.equal((await guest('POST','/rentals/quote',body)).total_price,1525000)
  assert.deepEqual(await stock(),before)
  const key=idempotent()
  const rental=await customer('POST','/rentals',body,201,key),path='/rentals/'+rental.id
  assert.equal((await customer('POST','/rentals',body,[200,201],key)).id,rental.id)
  await customer('POST','/rentals',{...body,rental_days:3},409,key)
  assert.deepEqual(await stock(),before.map((v,i)=>v-items[i].quantity))
  assert.equal((await other('GET','/rentals')).length,0)
  await other('GET',path,undefined,[403,404])
  await other('GET',path+'/invoice',undefined,[403,404])
  await other('POST',path+'/payments',{amount:1,payment_method:'EWALLET',provider:'DANA'},[403,404],idempotent())
  await admin('PATCH','/clothings/1',{rental_price_per_day:999999})
  assert.equal((await customer('GET',path+'/invoice')).total_price,1525000)
  await customer('POST',path+'/payments',{payment_method:'CASH',amount:2000000,cash_received:2000000},[422,409],idempotent())
  await customer('POST',path+'/payments',{payment_method:'TRANSFER',amount:500,bank_name:''},422,idempotent())
  const cash={payment_method:'CASH',amount:500000,cash_received:550000},cashKey=idempotent()
  await customer('POST',path+'/payments',cash,201,cashKey)
  await customer('POST',path+'/payments',cash,[200,201],cashKey)
  await customer('POST',path+'/payments',{...cash,amount:2},409,cashKey)
  let invoice=await customer('GET',path+'/invoice')
  assert.equal(invoice.payment_status,'PARTIALLY_PAID');assert.equal(invoice.payments.length,1);assert.equal(invoice.payments[0].change_amount,50000)
  await customer('POST',path+'/payments',{payment_method:'TRANSFER',amount:700000,bank_name:'BCA'},201,idempotent())
  await customer('POST',path+'/payments',{payment_method:'EWALLET',amount:325000,provider:'DANA'},201,idempotent())
  assert.equal((await customer('GET',path)).outstanding_amount,0)
  const late=new Date(rental.planned_return_date+'T12:00:00Z');late.setUTCDate(late.getUTCDate()+1)
  const returned={return_date:late.toISOString().slice(0,10),condition_on_return:'Baik',notes:'Lengkap'}
  await customer('POST',path+'/return',returned,403)
  await admin('POST',path+'/return',returned,201)
  await admin('POST',path+'/return',returned,409)
  assert.deepEqual(await stock(),before)
  invoice=await customer('GET',path+'/invoice');assert.equal(invoice.return_fee,10000);assert.equal(invoice.outstanding_amount,10000)
  await customer('POST',path+'/payments',{payment_method:'CASH',amount:10000,cash_received:10000},201,idempotent())
  await stop();await start()
  invoice=await customer('GET',path+'/invoice')
  assert.equal(invoice.outstanding_amount,0);assert.equal(invoice.status,'RETURNED');assert.equal(invoice.payment_status,'PAID')
  assert.equal(invoice.payments.length,4);assert.equal((await customer('GET','/rentals')).length,1)
  const dash=await admin('GET','/admin/dashboard')
  assert.equal(Number(dash.revenue),1535000);assert.equal(Number(dash.returned_rentals),1)
  const logs=await admin('GET','/admin/inventory-logs')
  assert.equal(logs.filter(x=>x.change_type==='RETURN').length,4);assert.equal(logs.filter(x=>x.change_type==='RENTAL').length,4)
  assert.equal((await admin('GET','/admin/customers')).find(x=>x.email==='customer@rentique.test').rental_count,1)
  await customer('PATCH','/auth/profile',{name:'Reka Demo',phone:'08120000',address:'Bandung',email:'customer@rentique.test'})
  assert.equal((await customer('GET','/auth/me')).name,'Reka Demo')
  await customer('POST','/auth/logout');await customer('GET',path,undefined,401)
  const lastUnit=await admin('POST','/clothings',{...product,name:'Satu unit',stock:1},201)
  const single={rental_days:1,items:[{clothing_id:lastUnit.id,quantity:1}]}
  const emails=['customer@rentique.test','other@rentique.test']
  const bookings=await race(emails.map(email=>[email,{operation:'create',body:single,key:randomUUID()}]))
  assert.equal(bookings.filter(x=>x.ok).length,1)
  assert.equal(bookings.find(x=>!x.ok).status,409)
  const winner=bookings.findIndex(x=>x.ok), booked=bookings[winner].data
  const payCommand={operation:'pay',id:booked.id,key:randomUUID(),body:{payment_method:'TRANSFER',amount:99000,bank_name:'BCA'}}
  const receipts=await race([0,1].map(()=>[emails[winner],payCommand]))
  assert.ok(receipts.every(x=>x.ok));assert.equal(receipts[0].data.id,receipts[1].data.id)
  const returns=await race([0,1].map(()=>['admin@rentique.test',{operation:'return',id:booked.id,body:{...returned,return_date:booked.planned_return_date}}]))
  assert.equal(returns.filter(x=>x.ok).length,1);assert.equal(returns.find(x=>!x.ok).status,409)
  assert.equal((await guest('GET','/clothings/'+lastUnit.id)).stock,1)
  console.log('PASS — '+checks+' HTTP responses checked. Original total 1525000, cash change 50000, late fee 10000, final balance 0. Stock, authorization, retries, logs, restart and three concurrent transaction races verified.')
} finally {
  await stop()
  if(prepared)cli('backend/tests/fixture.php','drop',schema)
}
