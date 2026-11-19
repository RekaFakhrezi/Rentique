# Desain Rentique

Rentique menampilkan pakaian, tarif per hari, dan ketersediaan sejak halaman koleksi. Pelanggan memilih beberapa pakaian untuk satu periode sewa. Administrator memakai ruang kerja tersendiri untuk mengelola pakaian, pembayaran yang tercatat, dan pengembalian.

## Identitas visual

| Elemen | Penggunaan |
| --- | --- |
| Playfair Display | Wordmark, judul etalase, nama pakaian dan judul kategori. Judul utama mengikuti tagline *Dress for the moment.* |
| Inter | Navigasi, harga, kontrol formulir, tabel, dan dasbor. |
| Putih dan kanvas `#F8F7F4` | Latar terang untuk fotografi, pilihan filter dan formulir. |
| Tinta `#191919` | Teks utama, tombol tindakan, dan tab jenis pakaian yang dipilih. |
| Pasir `#C6B59B` dan zaitun `#536451` | Bidang editorial, aksen wordmark, penanda ketersediaan, dan fokus keyboard. |
| Garis `#E5E3DF` | Pemisah navigasi, atribut produk, dan tabel. |

Gambar editorial dan ilustrasi fotografis produk dibuat khusus untuk demo ini. Berkas WebP disimpan di `frontend/public/images/` agar katalog dapat ditampilkan secara lokal. Saat URL foto produk gagal, kartu mencoba gambar jenis pakaiannya, lalu menampilkan ikon pakaian jika gambar pengganti juga gagal.

## Alur pelanggan

1. **Beranda** memasangkan tagline dengan potret editorial. Tiga kartu kategori membuka katalog dengan jenis gaun, jas, atau kostum yang telah dipilih.
2. **Koleksi** menggunakan foto rasio 3:4 dengan nama pakaian, ukuran, tarif harian dan status stok. Filter kategori acara terpisah dari jenis pakaian. Pencarian, filter dan urutan harga tersimpan pada URL, sehingga halaman hasil dapat dibuka kembali.
3. **Detail pakaian** menampilkan biaya khusus jenis pakaian, jumlah unit, dan durasi. Estimasi berasal dari endpoint quote PHP. Saat pelanggan mengubah durasi untuk tas yang sudah berisi barang, formulir memberi tahu bahwa durasi baru berlaku untuk seluruh tas.
4. **Tas dan checkout** menampilkan rincian harga beserta tanggal pengembalian sebelum transaksi disimpan. Riwayat sewa membedakan status pakaian dari status pembayaran. Invoice menyediakan tampilan cetak.

## Ruang kerja admin

Sidebar mengelompokkan ringkasan, inventaris, penyewaan, pengembalian, pelanggan, dan riwayat stok. Tabel memudahkan pencarian transaksi tertentu. Ringkasan menarik jumlah stok, pendapatan dan penyewaan dari API. Angka nol dan daftar kosong mengikuti isi basis data demo.

## Perangkat dan aksesibilitas

Etalase menggunakan empat kolom produk di desktop dan dua kolom hingga lebar 680 piksel. Pada ponsel, visual hero dan formulir detail ditumpuk. Tombol menu memiliki status buka atau tutup yang dapat dibaca pembaca layar. Navigasi memiliki tautan langsung ke konten, fokus keyboard terlihat, dan animasi mengikuti preferensi pengurangan gerakan. Status stok memiliki teks untuk mendampingi warna. Tombol cetak menggunakan dialog cetak browser.

## Referensi

Rasio foto dan jarak antarkartu mengikuti kebutuhan katalog busana. Alur sewa dan pilihan kategori editorial mengacu pada contoh yang disediakan dalam brief. [COS](https://www.cos.com/en-ww/women/dresses), [Rent the Runway](https://www.renttherunway.com/), [Nuuly](https://www.nuuly.com/)
