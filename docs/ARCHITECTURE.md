# Arsitektur Rentique

React Router membagi aplikasi menjadi etalase, halaman akun, dan ruang kerja admin. Komponen mengirim JSON ke API melalui `frontend/src/shared.jsx`. Tas disimpan di localStorage. Harga penawaran, stok, sesi, dan saldo berasal dari PHP. Me-refresh halaman membaca kembali transaksi dari PostgreSQL.

| Lapisan | Lokasi | Tanggung jawab |
| --- | --- | --- |
| HTTP | backend/public/index.php dan src/Controllers/ApiController.php | Membaca JSON, memilih endpoint, memeriksa akses, mengirim status HTTP dan respons JSON. |
| Sesi | backend/src/Middleware/Session.php | Cookie HttpOnly dan SameSite, token CSRF, pergantian ID sesi, pemeriksaan peran. |
| Aplikasi | backend/src/Services | CatalogService mengatur inventaris. RentalService mengoordinasikan penawaran, checkout, pembayaran, invoice, dan pengembalian. DashboardService membaca statistik. |
| Domain | backend/src/Models | Validasi jumlah, durasi, stok, harga rupiah, pembayaran dan denda menurut diagram kelas. |
| Persistensi | backend/src/Repositories | Prepared statements, hidrasi subtype, transaksi, penguncian dan ringkasan. |
| Penyimpanan | database/schema.sql | Sembilan tabel berelasi, foreign key, batas numerik, invoice dan pengembalian unik per sewa. |

## Satu checkout

1. Quote membuat Rental sementara dan memanggil addItem pada objek Clothing dalam memori.
2. Saat membuat transaksi, layanan mengunci pelanggan, memeriksa kunci idempotensi, lalu mengunci baris pakaian dalam urutan ID. Domain memvalidasi ulang stok dan menghitung harga.
3. Satu commit menyimpan sewa, item dengan harga historis, perubahan stok, log dan invoice. Kegagalan satu baris membatalkan seluruh transaksi.
4. Pembayaran memakai transaksi terpisah dengan kunci pada baris rental. Permintaan yang diulang dengan kunci dan isi yang sama mendapatkan hasil sebelumnya. Isi berbeda dengan kunci sama menghasilkan konflik. Jika pembayaran checkout gagal, transaksi sewa dapat dibuka kembali dan dibayar dari detail.
5. Admin mencatat pengembalian di bawah kunci rental dan pakaian. Denda memakai selisih tanggal kalender Jakarta. Satu commit menyimpan pengembalian, status, stok dan log. Saldo mencakup denda.

## Penyesuaian dari konsol

Versi web memiliki satu berkas per kelas dan autoload namespace Rentique. PostgreSQL membuat ID. Factory membentuk subtype dari kolom type atau role. RentalItem memulihkan tarif dan biaya tersimpan melalui restore, tanpa memotong stok lagi. Model memakai integer rupiah. Invoice dan InventoryLog menyediakan data terstruktur kepada API. Browser menangani cetak dan formulir profil. Pembayaran berhasil tersimpan sebagai baris PAID, sedangkan status pelunasan sewa dihitung dari total, denda dan pembayaran. Log mencatat pelaku pelanggan ketika checkout. Pakaian dinonaktifkan sehingga transaksi lama tetap dapat dibaca.

Program Java dan PHP konsol disalin secara terpisah agar contoh asli, keluaran terminal, dan ID dalam memori tetap dapat didemonstrasikan.
