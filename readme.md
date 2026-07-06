# Rentsync (Rental Mobil P2P System)

Aplikasi penyewaan mobil multi-cabang (Bekasi, Bogor, Depok, Jakarta, Tangerang) yang menggunakan arsitektur *Peer-to-Peer* (P2P) berbasis MongoDB Replica Set dan sinkronisasi lintas cabang (Cross Branch) via jaringan ZeroTier.

## 📖 Dokumentasi

Untuk keperluan pengembangan (development) di satu perangkat lokal tanpa harus terhubung ke jaringan P2P/ZeroTier, Anda **diwajibkan** untuk membaca panduan berikut sebelum memulai:

👉 **[Panduan Local Development & GitHub Workflow](./local-development/panduan.md)**

Panduan di atas berisi tata cara lengkap untuk:
- Melakukan Setup Lingkungan Lokal secara otomatis (membuat 5 database cabang di `localhost`).
- Menjalankan 5 server API (Node.js) secara serentak.
- Tata cara berpindah (*switch*) ke pengembangan fitur baru di GitHub menggunakan Git Branch terpisah.
- Mengembalikan mode aplikasi ke mode Produksi P2P.
