import { useEffect, useId, useRef, useState } from 'react';
import { Ellipsis, Inbox, RotateCw, Search, Shirt, X } from 'lucide-react';
import { api, dateLabel, useLoad } from '../../shared.jsx';
export { jakartaToday as today } from '../../shared.jsx';

export const types = { DRESS: 'Gaun', SUIT: 'Jas', COSTUME: 'Kostum' };
const labels = {
  RENTED: 'Disewa', RETURNED: 'Dikembalikan', DRAFT: 'Draf',
  PAID: 'Lunas', PARTIALLY_PAID: 'Dibayar sebagian', UNPAID: 'Belum dibayar',
  INITIAL: 'Stok awal', ADJUSTMENT: 'Penyesuaian', RENTAL: 'Penyewaan', RETURN: 'Pengembalian',
  CASH: 'Tunai', TRANSFER: 'Transfer bank', EWALLET: 'Dompet digital',
};
export const label = key => labels[key] || key;
const times = new Intl.DateTimeFormat('id-ID', { hour:'2-digit', minute:'2-digit', timeZone:'Asia/Jakarta' });
export function dateText(value, showTime = false) {
  return dateLabel(value) + (value && showTime ? ' • ' + times.format(new Date(value)) : '');
}
export function rentalCode(id) { return '#' + String(id).padStart(5, '0'); }
export function matches(query, ...values) {
  const words = values.filter(v => v != null).join(' ').toLocaleLowerCase('id-ID');
  return words.includes(query.trim().toLocaleLowerCase('id-ID'));
}

export function useResource(path) {
  const resource = useLoad(() => path ? api(path) : null, path);
  return { ...resource, reload: resource.retry };
}
export function Load({ resource, children }) {
  if (resource.loading) return <div className="adm-skeleton" aria-busy="true" role="status" aria-label="Memuat data"><i/><i/><i/></div>;
  if (resource.error) return <div className="adm-error" role="alert"><p>{resource.error}</p><button type="button" className="adm-btn" onClick={resource.reload}><RotateCw size={15}/> Coba lagi</button></div>;
  return children(resource.data);
}
export function Empty({ title = 'Belum ada data', children }) {
  return <div className="adm-empty"><Inbox size={25} strokeWidth={1.35}/><strong>{title}</strong>{children && <p>{children}</p>}</div>;
}
export function Status({ value }) {
  return <span className={'adm-badge adm-badge-' + String(value).toLowerCase()}>{label(value)}</span>;
}
export function Stock({ item }) {
  const state = !item.is_active && item.is_active !== undefined ? 'inactive' : Number(item.stock) === 0 ? 'empty' : 'available';
  return <span className={'adm-badge adm-badge-' + state}>{({inactive:'Nonaktif', empty:'Habis', available:'Tersedia'})[state]}</span>;
}
export function Photo({ src, className = '' }) {
  const [failed, setFailed] = useState('');
  return <span className={'adm-photo ' + className}>{src && failed !== src ? <img src={src} alt="" loading="lazy" onError={() => setFailed(src)}/> : <Shirt size={19}/>}</span>;
}
export function Heading({ title, children, action }) {
  return <div className="adm-heading"><div><h1>{title}</h1>{children && <p>{children}</p>}</div>{action}</div>;
}
export function SearchBox({ value, onChange, placeholder }) {
  return <label className="adm-search"><Search size={17}/><input type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)}/></label>;
}
export function Table({ headers, children, caption }) {
  return <div className="adm-scroll" role="region" tabIndex={0} aria-label={caption}><table aria-label={caption}><thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
export function Field({ name, children, wide }) {
  return <label className={'adm-field' + (wide ? ' adm-wide' : '')}><span>{name}</span>{children}</label>;
}
export function Dialog({ title, close, busy = false, children }) {
  const ref = useRef(null);
  const heading = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="adm-dialog" aria-labelledby={heading} onCancel={event => {event.preventDefault(); if (!busy) close();}}>
    <div className="adm-dialog-head"><h2 id={heading}>{title}</h2><button className="adm-icon" type="button" aria-label="Tutup dialog" disabled={busy} onClick={close}><X size={18}/></button></div>
    <div className="adm-dialog-body">{children}</div>
  </dialog>;
}
export function FormActions({ close, busy, text, danger }) {
  return <div className="adm-form-actions"><button type="button" className="adm-btn" disabled={busy} onClick={close}>Batal</button>
    <button type="submit" className={'adm-btn ' + (danger ? 'adm-danger' : 'adm-primary')} disabled={busy}>{busy ? 'Menyimpan…' : text}</button></div>;
}
export function Actions({ title, options, onSelect }) {
  return <label className="adm-actions" title={title}><Ellipsis size={18}/><select aria-label={title} value="" onChange={event => onSelect(event.target.value)}>
    <option value="" disabled>{title}</option>{Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
  </select></label>;
}
