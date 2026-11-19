# API Rentique

Semua path di tabel berawal dari `/api`. Respons berbentuk `{"success":true,"data":...,"message":""}`. Saat gagal, data bernilai null dan message berisi pesan untuk pengguna. Gunakan Content-Type application/json untuk request body.

Mulai dengan GET /auth/me, simpan cookie dan header respons X-CSRF-Token. Kirim cookie dan token terbaru pada setiap POST, PATCH, atau DELETE, termasuk login dan quote. Token dan cookie berubah setelah login atau logout. Tambahkan header Idempotency-Key (8–128 huruf, angka, titik, garis bawah atau tanda hubung) pada pembuatan sewa dan pembayaran. Pertahankan kunci untuk pengulangan permintaan yang sama.

| Metode dan path | Akses | Input atau hasil |
| --- | --- | --- |
| POST /auth/login | Umum | email, password. Mengembalikan profil aman. |
| GET /auth/me | Umum | Profil aktif atau null. |
| POST /auth/logout | Sesi | Mengakhiri identitas sesi. |
| PATCH /auth/profile | Login | name, email, phone, address. |
| GET /categories | Umum | Daftar kategori. |
| GET /clothings | Umum | search, category_id, type, size, available, sort. Urutan price_asc, price_desc, name atau newest. Admin dapat mengirim include_inactive=true. |
| GET /clothings/{id} | Umum | Detail pakaian dan atribut subtype. |
| POST /clothings | Admin | name, category_id, type, size, color, rental_price_per_day, stock, condition, description, image_url serta atribut khusus. |
| PATCH /clothings/{id} | Admin | Perubahan field pakaian. Sertakan expected_stock jika formulir mengganti jumlah absolut. |
| DELETE /clothings/{id} | Admin | Nonaktifkan pakaian. |
| POST /clothings/{id}/adjust-stock | Admin | quantity_changed bertanda dan notes. |
| POST /rentals/quote | Umum | Hitung total, tanggal dan rincian item. |
| POST /rentals | Pelanggan | Struktur body sama dengan quote. Membuat sewa dan invoice. |
| GET /rentals | Login | Pelanggan hanya melihat transaksi sendiri. Admin melihat semua. |
| GET /rentals/{id} | Pemilik atau admin | Ringkasan, item, status sewa dan saldo. |
| GET, POST /rentals/{id}/payments | Pemilik atau admin | Daftar pembayaran atau pembayaran baru. |
| GET /rentals/{id}/invoice | Pemilik atau admin | Invoice terstruktur termasuk histori dan sisa tagihan. |
| POST /rentals/{id}/return | Admin | return_date dengan format YYYY-MM-DD, condition_on_return dan notes. |
| GET /rentals/{id}/return | Pemilik atau admin | Rekaman pengembalian, denda dan pelaku. |
| GET /admin/dashboard | Admin | Statistik, transaksi terbaru dan stok rendah. |
| GET /admin/inventory-logs | Admin | Log stok dengan pelaku dan catatan. |
| GET /admin/customers | Admin | Kontak pelanggan dan jumlah sewa. |

## Contoh body

Quote atau pembuatan sewa menggunakan satu durasi untuk semua pakaian. Tanggal sewa default adalah hari ini di Jakarta.

```json
{"rental_days":2,"items":[{"clothing_id":1,"quantity":1},{"clothing_id":2,"quantity":1},{"clothing_id":3,"quantity":2},{"clothing_id":4,"quantity":1}]}
```

Pembayaran tunai menggunakan nominal yang dialokasikan ke sewa dan uang yang diserahkan.

```json
{"payment_method":"CASH","amount":500000,"cash_received":550000}
```

TRANSFER memerlukan bank_name. EWALLET memerlukan provider. Semua nominal adalah integer rupiah. Status rental memakai DRAFT, RENTED, RETURNED. Status pelunasan memakai UNPAID, PARTIALLY_PAID, PAID.

## Hasil HTTP

200 untuk baca dan pembaruan, 201 untuk pembuatan sewa, produk, pembayaran dan pengembalian. 400 untuk JSON rusak, 401 untuk sesi yang diperlukan, 403 untuk akses atau token CSRF, 404 untuk sumber yang tidak tersedia bagi pengguna, 409 untuk konflik stok atau permintaan, dan 422 untuk nilai yang tidak valid. Basis data yang tidak dapat diakses menghasilkan 503.
