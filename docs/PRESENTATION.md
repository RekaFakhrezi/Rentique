# Demonstrasi kelas PBO

Gunakan dua profil browser terpisah untuk admin dan pelanggan agar kedua sesi dapat berjalan bersamaan. Mulai dari seed baru dengan stok Jas Standar 3, Jas Premium 2, Dress Pesta 2, dan Kostum Bajak Laut 2.

1. Perlihatkan diagram kelas dan jalankan kedua program konsol. Catat nilai pembanding Rp1.525.000.
2. Masuk sebagai admin. Buka Inventaris, daftarkan satu pakaian baru dan periksa log stok awal. Tambahkan satu unit Jas Standar dengan catatan. Stoknya sekarang 4.
3. Masuk sebagai pelanggan. Dari Koleksi, pilih masing-masing satu Jas Standar, satu Jas Premium, dua Dress Pesta, dan satu Kostum Bajak Laut. Atur durasi tas menjadi dua hari. Buka ringkasan harga.
4. Tunjukkan subtotal Rp220.000, Rp530.000, Rp600.000, dan Rp175.000. Biaya cuci jas dan aksesori kostum dihitung satu kali per unit. Quote belum mengubah stok.
5. Checkout dengan **Bayar sebagian**, tunai Rp500.000, uang diterima Rp550.000. Buka invoice dan tunjukkan kembalian Rp50.000. Stok empat produk sekarang 3, 1, 0, dan 1.
6. Dari detail sewa bayar Rp700.000 melalui transfer BCA, lalu Rp325.000 melalui DANA. Status pembayaran menjadi lunas sementara pakaian masih disewa. Cetak invoice atau gunakan pratinjau cetak.
7. Di ruang admin buka Penyewaan, pilih transaksi, lalu proses pengembalian. Untuk simulasi, isi tanggal aktual satu hari setelah rencana kembali, kondisi Baik, dan catatan pakaian lengkap. Tunjukkan denda Rp10.000 dan status dikembalikan. Stok kembali menjadi 4, 2, 2, dan 2.
8. Kembali ke akun pelanggan, lunasi Rp10.000. Muat ulang invoice. Saldo akhir Rp0. Periksa riwayat stok admin untuk melihat pengurangan dan pengembalian tiap jenis pakaian.
9. Buka Rental::addItem, RentalItem::calculateSubtotal, dan Payment::processPayment pada subclass. Hubungkan tindakan di layar dengan [pemetaan OOP](OOP-MAPPING.md).

Untuk mengulangi skenario secara otomatis tanpa memengaruhi stok presentasi, jalankan tes HTTP seperti dijelaskan dalam README.
