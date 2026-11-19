import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, rupiah } from '../../shared.jsx';
import { Actions, Dialog, Empty, Field, FormActions, Heading, Load, matches, Photo, SearchBox, Stock, Table, types, useResource } from './ui.jsx';

const titles = { create:'Tambah pakaian', edit:'Edit pakaian', stock:'Sesuaikan stok', deactivate:'Nonaktifkan pakaian', detail:'Detail pakaian' };
const actions = { detail:'Lihat detail', edit:titles.edit, stock:titles.stock, deactivate:titles.deactivate };
const numeric = ['category_id', 'rental_price_per_day', 'stock', 'dry_cleaning_fee', 'accessory_fee'];

function ClothingFields({ product, categories }) {
  const [type, setType] = useState(product?.type || 'DRESS');
  return <div className="adm-fields">
    <Field name="Nama pakaian" wide><input name="name" required maxLength="150" defaultValue={product?.name}/></Field>
    <Field name="Jenis"><select name="type" value={type} onChange={e => setType(e.target.value)}>{Object.entries(types).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></Field>
    <Field name="Kategori"><select name="category_id" defaultValue={product?.category_id || ''} required><option value="" disabled>Pilih kategori</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    <Field name="Ukuran"><input name="size" maxLength="40" required defaultValue={product?.size}/></Field>
    <Field name="Warna"><input name="color" maxLength="60" required defaultValue={product?.color}/></Field>
    <Field name="Tarif per hari (Rp)"><input name="rental_price_per_day" type="number" min="0" step="1" required defaultValue={product?.rental_price_per_day}/></Field>
    <Field name={product ? 'Stok tersedia' : 'Stok awal'}>{product ? <input value={product.stock} readOnly title="Gunakan aksi Sesuaikan stok untuk mengubah jumlah unit."/> : <input name="stock" type="number" min="0" step="1" required defaultValue="0"/>}</Field>
    {type === 'DRESS' && <Field name="Gaya gaun" wide><input name="dress_style" required defaultValue={product?.dress_style}/></Field>}
    {type === 'SUIT' && <Field name="Biaya cuci per unit (Rp)" wide><input name="dry_cleaning_fee" type="number" min="0" step="1" required defaultValue={product?.dry_cleaning_fee || 0}/></Field>}
    {type === 'COSTUME' && <><Field name="Tema kostum"><input name="theme" required defaultValue={product?.theme}/></Field>
      <Field name="Biaya aksesori per unit (Rp)"><input name="accessory_fee" type="number" min="0" step="1" required defaultValue={product?.accessory_fee || 0}/></Field></>}
    <Field name="Kondisi" wide><input name="condition" required defaultValue={product?.condition || 'Baik'}/></Field>
    <Field name="Deskripsi" wide><textarea name="description" rows={3} defaultValue={product?.description}/></Field>
    <Field name="Alamat gambar" wide><input name="image_url" placeholder="https://… atau /images/…" defaultValue={product?.image_url}/></Field>
  </div>;
}
function ProductSummary({ item }) {
  return <div className="adm-product-summary"><Photo src={item.image_url}/><div><h3>{item.name}</h3><p>{types[item.type]} · Ukuran {item.size} · {item.color}</p></div></div>;
}
function StockFields({ product }) {
  const [direction, setDirection] = useState('in');
  const [amount, setAmount] = useState('1');
  const next = Number(product.stock) + (direction === 'in' ? 1 : -1) * Number(amount);
  return <>
    <div className="adm-fields"><Field name="Perubahan"><select name="direction" value={direction} onChange={e => setDirection(e.target.value)}><option value="in">Tambah stok</option><option value="out">Kurangi stok</option></select></Field>
      <Field name="Jumlah unit"><input name="amount" type="number" required min="1" max={direction === 'out' ? Number(product.stock) : undefined} step="1" value={amount} onChange={e => setAmount(e.target.value)}/></Field>
      <Field name="Alasan penyesuaian" wide><textarea name="notes" required rows="3" placeholder="Contoh: Penambahan unit dari penjahit"/></Field>
    </div>
    <div className="adm-summaryline"><span>Stok setelah disimpan</span><strong>{amount && next >= 0 ? next + ' unit' : '—'}</strong></div>
  </>;
}
function ProductDialog({ mode, product, close, saved }) {
  const needsCategories = mode === 'edit' || mode === 'create';
  const categories = useResource(needsCategories ? '/categories' : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    const form = Object.fromEntries(new FormData(e.currentTarget));
    let path = '/clothings', method = 'POST', body = form;
    if (mode !== 'create') path += '/' + product.id;
    if (needsCategories) {
      if (mode === 'edit') method = 'PATCH';
      for (const key of numeric) if (key in body) body[key] = Number(body[key]);
    } else if (mode === 'stock') {
      path += '/adjust-stock';
      body = {quantity_changed: Number(form.amount) * (form.direction === 'in' ? 1 : -1), notes:form.notes};
    } else { method = 'DELETE'; body = undefined; }
    setSaving(true);
    setError('');
    try {
      await api(path, {method, body});
      toast.success(({ create:'Pakaian ditambahkan.', edit:'Perubahan disimpan.', stock:'Stok diperbarui.', deactivate:'Pakaian dinonaktifkan.' })[mode]);
      saved();
    } catch (e) { setError(e.message); setSaving(false); }
  }
  return <Dialog title={titles[mode]} close={close} busy={saving}>
    {product && mode !== 'edit' && <ProductSummary item={product}/>}
    {mode === 'detail' ? <>
      <dl className="adm-dl"><div><dt>Kategori</dt><dd>{product.category_name}</dd></div><div><dt>Stok</dt><dd>{product.stock} unit</dd></div>
        <div><dt>Tarif per hari</dt><dd>{rupiah(product.rental_price_per_day)}</dd></div><div><dt>Kondisi</dt><dd>{product.condition}</dd></div>
        <div><dt>Status</dt><dd><Stock item={product}/></dd></div>
        {product.type === 'DRESS' && <div><dt>Gaya gaun</dt><dd>{product.dress_style}</dd></div>}
        {product.type === 'SUIT' && <div><dt>Biaya cuci per unit</dt><dd>{rupiah(product.dry_cleaning_fee)}</dd></div>}
        {product.type === 'COSTUME' && <><div><dt>Tema</dt><dd>{product.theme}</dd></div><div><dt>Aksesori per unit</dt><dd>{rupiah(product.accessory_fee)}</dd></div></>}
      </dl>{product.description && <p>{product.description}</p>}<div className="adm-form-actions"><button className="adm-btn" onClick={close}>Tutup</button></div>
    </> : <form onSubmit={submit}>
      {needsCategories && <Load resource={categories}>{rows => <ClothingFields product={product} categories={rows}/>}</Load>}
      {mode === 'stock' && <StockFields product={product}/>}
      {mode === 'deactivate' && <p>Pakaian ini akan disembunyikan dari katalog. Riwayat sewa dan pembayaran tetap tersimpan.</p>}
      {error && <p className="adm-error" role="alert">{error}</p>}
      {(!needsCategories || categories.data) && <FormActions close={close} busy={saving} text={mode === 'deactivate' ? 'Nonaktifkan' : 'Simpan'} danger={mode === 'deactivate'}/>}
    </form>}
  </Dialog>;
}

export default function Inventory() {
  const resource = useResource('/clothings?include_inactive=1');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [availability, setAvailability] = useState('');
  const [dialog, setDialog] = useState(null);
  const [params, setParams] = useSearchParams();
  const selected = params.get('product');
  useEffect(() => {
    if (selected && resource.data) {
      const item = resource.data.find(row => String(row.id) === selected);
      if (item) setDialog({mode:'detail', product:item});
      setParams({}, {replace:true});
    }
  }, [selected, resource.data, setParams]);
  function visible(item) {
    return (!type || item.type === type) && matches(query,item.name,item.color,item.category_name,item.size)
      && (!availability || (availability === 'available' && item.is_active && item.stock > 0) || (availability === 'empty' && item.is_active && Number(item.stock) === 0) || (availability === 'inactive' && !item.is_active));
  }
  return <>
    <Heading title="Inventaris" action={<button className="adm-btn adm-primary" onClick={() => setDialog({mode:'create'})}><Plus size={17}/>Tambah pakaian</button>}>Kelola koleksi, tarif sewa, dan ketersediaan pakaian.</Heading>
    <section className="adm-panel"><div className="adm-tools">
      <SearchBox value={query} onChange={setQuery} placeholder="Cari nama, warna, kategori…"/>
      <select aria-label="Filter jenis" value={type} onChange={e => setType(e.target.value)}><option value="">Semua jenis</option>{Object.entries(types).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
      <select aria-label="Filter ketersediaan" value={availability} onChange={e => setAvailability(e.target.value)}><option value="">Semua status</option><option value="available">Tersedia</option><option value="empty">Habis</option><option value="inactive">Nonaktif</option></select>
    </div><Load resource={resource}>{data => {
      const rows = data.filter(visible);
      return rows.length ? <Table caption="Daftar pakaian" headers={['Pakaian','Jenis / kategori','Tarif per hari','Stok','Status','Aksi']}>
        {rows.map(c => <tr key={c.id}><td><button className="adm-product" onClick={() => setDialog({mode:'detail',product:c})}><Photo src={c.image_url}/><span><strong>{c.name}</strong><small>{c.size} · {c.color}</small></span></button></td>
          <td>{types[c.type]}<small>{c.category_name}</small></td><td>{rupiah(c.rental_price_per_day)}</td><td>{c.stock} unit</td><td><Stock item={c}/></td>
          <td><Actions title={'Aksi untuk ' + c.name} options={c.is_active ? actions : {detail:actions.detail}} onSelect={mode => setDialog({mode,product:c})}/></td></tr>)}
      </Table> : <Empty title="Pakaian tidak ditemukan">Ubah filter pencarian atau tambahkan pakaian baru.</Empty>;
    }}</Load></section>
    {dialog && <ProductDialog key={dialog.mode + '-' + (dialog.product?.id || '')} {...dialog} close={() => setDialog(null)} saved={() => {setDialog(null); resource.reload();}}/>}
  </>;
}
