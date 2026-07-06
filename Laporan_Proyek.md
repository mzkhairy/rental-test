# Laporan Proyek: RentSync - Sistem Manajemen Rental P2P Terdistribusi

## 1. Tahap Pembuatan (Development Phases)
1. **Analisis Kebutuhan & Arsitektur:** Menentukan struktur *Peer-to-Peer* (P2P) untuk komunikasi antar cabang (Bogor, Depok, Jakarta, Tangerang, Bekasi).
2. **Desain Basis Data:** Membuat skema *Mongoose* untuk entitas utama (Branch, Customer, Employee, Vehicle, Rental, Transfer) dengan mendukung pencatatan status Lintas Cabang.
3. **Pengembangan Backend (API):** Membangun RESTful API menggunakan Node.js dan Express, termasuk membuat *endpoint* khusus untuk saling bertukar data (P2P) menggunakan `axios`.
4. **Pengembangan Frontend:** Membuat antarmuka pengguna berbasis Vanilla HTML/CSS/JS yang *responsive*, dinamis, dan saling terhubung ke API lokal setiap cabang.
5. **Implementasi Ketersediaan Dinamis:** Membuat algoritma pengecekan ketersediaan kendaraan berbasis *overlap* rentang waktu (`expectedRentFinishDate`), tidak hanya bergantung pada status statis.
6. **Integrasi Jaringan Fisik:** Membuat skrip otomatisasi `setup_device.ps1` untuk konfigurasi *ZeroTier* / *Local Switch* dan *MongoDB Replica Set* lintas perangkat.

## 2. Spesifikasi Teknologi
**Backend:**
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (dengan arsitektur *Replica Set*)
- **ODM:** Mongoose
- **P2P Client:** Axios

**Frontend:**
- **Struktur & Gaya:** HTML5, CSS3, FontAwesome (Ikon)
- **Logika UI:** Vanilla JavaScript (DOM Manipulation, Fetch API)
- **Komponen Ekstra:** SweetAlert2 (untuk notifikasi/Pop-up)

**Infrastruktur & Jaringan:**
- **Virtual LAN (P2P):** ZeroTier / Local Switch
- **Orkestrasi:** Skrip PowerShell (`setup_device.ps1`)

## 3. Setup dan Cara Running

1. **Persiapan Jaringan (Opsional):** Pastikan semua PC cabang terhubung ke dalam jaringan *ZeroTier* atau *Local Switch* yang sama.
2. **Eksekusi Secondary Node:** 
   - Pada PC cabang Jakarta, Bogor, Tangerang, dan Depok, buka terminal as Administrator.
   - Jalankan `.\setup_device.ps1`.
   - Pilih jaringan, lalu pilih cabangnya. Biarkan proses selesai dan MongoDB menyala di *background*.
3. **Eksekusi Primary Node:**
   - Setelah keempat PC di atas siap, jalankan `.\setup_device.ps1` di PC Bekasi (Primary).
   - Skrip akan otomatis menginisiasi *Replica Set* (menghubungkan kelima PC) dan melakukan *seeding* (memasukkan data awal).
   - Ikuti prompt interaktif jika Anda ingin menambahkan PC yang *online* satu per satu.
4. **Menjalankan Aplikasi:**
   - Di terminal masing-masing PC, ketik `npm start`.
   - Buka browser dan akses `http://localhost:4000`.

## 4. Fitur-Fitur Utama
- **Arsitektur P2P Lintas Cabang:** Sistem tidak terpusat di satu server web. Setiap cabang memiliki *server* API sendiri yang dapat saling "berbicara".
- **Dynamic Date-based Availability:** Sistem pintar yang mencegah *double-booking* dengan membandingkan irisan tanggal mulai (`startDate`) dan perkiraan tanggal selesai (`expectedRentFinishDate`).
- **Distributed Database Replica:** Data diamankan dan direplikasi secara *real-time* ke semua cabang sehingga jika satu cabang *down*, data tidak hilang.
- **Manajemen Lengkap:** CRUD (Create, Read, Update, Delete) untuk Karyawan, Pelanggan, Kendaraan, dan Penyewaan.

## 5. Flow Aplikasi
1. **Login:** Karyawan (Employee) membuka aplikasi lokal, login menggunakan NIK dan kata sandi. 
2. **Dashboard:** Menampilkan ringkasan status kendaraan (Tersedia, Sedang Disewa, Pemeliharaan) di cabang tersebut.
3. **Penyewaan (Lokal):** Karyawan memilih pelanggan dan kendaraan dari cabang sendiri. Status kendaraan langsung berubah menjadi *Booked* hingga selesai disewa.
4. **Penyewaan (Lintas Cabang):** Jika mobil yang dicari tidak ada di cabang sendiri, karyawan mencari stok dari cabang lain. 
   - Sistem akan melakukan P2P memanggil API cabang tujuan.
   - Cabang peminjam membuat transaksi sewa, dan cabang pemilik mobil membuat transaksi transfer (Transfer/Mutasi).

## 6. Skenario Utama
1. **Skenario Sewa Lokal (Local Rental):**
   - Customer Budi datang ke cabang Jakarta dan menyewa Avanza Jakarta dari tanggal 1-5 Agustus. 
   - Avanza Jakarta otomatis hilang dari daftar "Kendaraan Tersedia" untuk pencarian tanggal 1-5 Agustus, namun tetap muncul jika dicari untuk tanggal 6 Agustus ke atas.
2. **Skenario Penyewaan Lintas Cabang (Cross-Branch):**
   - Cabang Depok kehabisan SUV. Customer ingin menyewa Pajero dari cabang Bogor via cabang Depok.
   - Depok membuat *rental* lintas cabang. Bogor menerima notifikasi/data `Transfer` dan menyetujui mutasi unit ke Depok.
   - Selama proses ini, mobil berstatus *Booked* atau *Rented By Request*.
3. **Skenario Edit / Ubah Rencana:**
   - Saat status masih *Pending Payment*, customer berubah pikiran ingin menyewa mobil yang lain.
   - Karyawan menekan tombol edit, mengubah cabang pengambilan (atau mobil), lalu menyimpannya. Sistem mencabut blokir dari mobil lama dan memblokir tanggal pada mobil baru secara dinamis.

## 7. Daftar Form yang Tersedia

1. **Form Login**
   > *[PLACEHOLDER GAMBAR: Screenshot Halaman Login]*
2. **Form Data Karyawan (Tambah/Edit)**
   - NIK, Nama, Email, Password, Cabang.
   > *[PLACEHOLDER GAMBAR: Screenshot Modal Karyawan]*
3. **Form Data Pelanggan (Tambah/Edit)**
   - No KTP, No SIM, Nama, Email, Telepon, Alamat.
   > *[PLACEHOLDER GAMBAR: Screenshot Modal Pelanggan]*
4. **Form Kendaraan (Tambah/Edit)**
   - Plat Nomor, Merek, Model, Kategori, Harga Sewa, Status.
   > *[PLACEHOLDER GAMBAR: Screenshot Modal Kendaraan]*
5. **Form Sewa Lokal**
   - Pilihan Pelanggan, Pilihan Kendaraan, Tanggal Mulai, Total Hari.
   > *[PLACEHOLDER GAMBAR: Screenshot Modal Sewa Lokal]*
6. **Form Sewa Lintas Cabang (Cross-Branch)**
   - Pilihan Cabang Pemilik, Pilihan Kendaraan Dinamis, Lokasi *Pickup*, Tanggal Mulai, Total Hari.
   > *[PLACEHOLDER GAMBAR: Screenshot Modal Sewa Lintas Cabang]*
7. **Form Edit Sewa (Mode Pending Payment)**
   - Penyesuaian rentang waktu, kendaraan, dan lokasi pengambilan (*Pickup*) tanpa membatalkan transaksi.
   > *[PLACEHOLDER GAMBAR: Screenshot Modal Edit Sewa]*
