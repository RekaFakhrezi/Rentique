# Rentique — Clothing Rental Management System

Rentique adalah aplikasi sewa pakaian untuk demonstrasi PBO. Satu transaksi dapat memuat beberapa gaun, jas, dan kostum. Pelanggan memilih durasi, membayar secara bertahap, dan mencetak invoice. Admin mengatur stok serta memproses pengembalian. Seluruh pembayaran merupakan simulasi.

## Menjalankan aplikasi di komputer ini

Workspace ini sudah memiliki PHP portabel, PostgreSQL lokal, konfigurasi backend, dan 12 pakaian demo. Dari direktori proyek, jalankan perintah PowerShell berikut bila layanan belum berjalan. Database demo menggunakan port 55432 dan menyimpan data di `.local/pg-demo`.

```powershell
& '.local/qa/node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe' -D '.local/pg-demo' -l '.local/postgres.log' -o '-h 127.0.0.1 -p 55432' -w start
cd backend
& '../.local/php/php.exe' -S 127.0.0.1:8000 -t public public/index.php
```

Di terminal kedua, mulai dari direktori proyek:

```powershell
cd frontend
npm.cmd run dev
```

Buka alamat lokal yang dicetak Vite. Gunakan tombol **Masuk**, pilih akun demo untuk mengisi formulir, lalu klik **Masuk**.

| Akun | Email | Kata sandi demo |
| --- | --- | --- |
| Pelanggan | customer@rentique.test | Customer123! |
| Admin | admin@rentique.test | Admin123! |

## Instalasi di komputer lain atau dengan Supabase

Siapkan PHP CLI 8.2+ dengan ekstensi PDO dan pdo_pgsql, Node.js 22.12+ beserta npm, dan PostgreSQL lokal atau proyek Supabase khusus demo. JDK 17+ diperlukan untuk demo Java. Composer opsional karena bootstrap menyediakan autoloader.

1. Untuk PostgreSQL lokal, buat database kosong dan akun pemilik tabel. Untuk Supabase, buat proyek dan buka **Connect**. Salin host database langsung atau **Session pooler**, port, database, username lengkap, dan password database proyek. Detail koneksi tersedia di [panduan PostgreSQL Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).
2. Salin `backend/.env.example` ke `backend/.env`. Isi `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, dan `DB_PASSWORD`. Untuk Supabase gunakan `DB_SSLMODE=require`. Simpan kredensial hanya di backend. Gunakan akun yang membuat tabel untuk koneksi PHP karena tabel memakai RLS tanpa kebijakan baca publik.
3. Dari root, jalankan migrasi sekali pada database kosong, lalu seeder. Seeder dapat diulang untuk ID demo yang sama tanpa mengatur ulang stok atau pembayaran. Gunakan database khusus demo karena akun dan kata sandi contoh diketahui pengguna.
4. Jalankan backend dan frontend di dua terminal. Vite meneruskan `/api` ke `localhost:8000`.

```sh
php database/migrate.php
php database/seed.php
cd backend
php -S localhost:8000 -t public public/index.php
```

```sh
cd frontend
npm install
npm run dev
```

## Demo konsol dan pemeriksaan

Dari root, Java menggunakan kelas utama dari draft yang disertakan. Kompilasi semua kelas dalam satu berkas sebelum menjalankan Main.

```sh
javac -encoding UTF-8 -d java java/Main.java
java -cp java Main
php php-console/Main.php
php backend/tests/domain.php
node backend/tests/api.mjs
```

Tes HTTP membuat skema PostgreSQL sementara, memuat seed, memulai proses PHP pada port acak, menguji akses dua pelanggan, pembayaran, pengembalian, stok, serta restart API, lalu menghapus skema tes. Gunakan database lokal khusus pengujian dengan izin membuat skema. Jika PHP belum di PATH, pada PowerShell atur `$env:PHP_BIN = (Resolve-Path '.local/php/php.exe').Path` sebelum menjalankan tes HTTP.

```sh
cd frontend
npm run build
```

## Pemecahan masalah

| Gejala | Pemeriksaan |
| --- | --- |
| API mengembalikan 503 | Periksa layanan PostgreSQL, kredensial, port dan SSL di backend/.env. Jalankan migrasi pada database baru, lalu seed. |
| PHP melaporkan “could not find driver” | Jalankan `php --ini` dan `php -m`. Aktifkan pdo_pgsql dalam konfigurasi PHP CLI. |
| Vite melaporkan koneksi proxy gagal atau mengarah ke aplikasi lain | Samakan alamat PHP dan target proxy. Untuk IPv4, jalankan PHP di `127.0.0.1:8000`, set `RENTIQUE_API_TARGET=http://127.0.0.1:8000` di `frontend/.env.local`, lalu mulai ulang Vite. Workspace ini sudah memakai pengaturan tersebut. |
| CSRF 403 setelah beralih akun | Muat ulang halaman untuk mengambil token sesi terbaru. Buka frontend dan API melalui origin Vite yang sama. |
| Koneksi langsung Supabase gagal di jaringan IPv4 | Pakai host dan username Session pooler dari panel Connect. |
| Stok berubah saat checkout | Buka tas, sesuaikan jumlah menurut stok terbaru, lalu ulangi checkout. |

[Arsitektur](docs/ARCHITECTURE.md) · [Pemetaan OOP](docs/OOP-MAPPING.md) · [Desain](docs/DESIGN.md) · [Kontrak API](docs/API.md) · [Panduan presentasi](docs/PRESENTATION.md) · [Diagram UML](docs/class-diagram.png)
