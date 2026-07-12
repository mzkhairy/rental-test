# Laporan Daftar Form Aplikasi RentSync

Dokumen ini memuat rangkuman seluruh antarmuka pengisian data (form) yang terdapat di dalam sistem informasi penyewaan kendaraan RentSync. 

RentSync menggunakan pendekatan *Single Form for CRUD* di banyak halamannya, yang berarti satu form (modal) yang sama digunakan secara dinamis, baik untuk **Menambah** data baru (*Create*) maupun **Mengubah** data yang sudah ada (*Update*), tergantung dari tombol aksi mana yang memanggil modal tersebut.

Berikut adalah 7 (tujuh) bentuk form operasional beserta fungsi dan elemen (field) yang ada di dalamnya:

---

## 1. Form Login (`login.html`)
Form pertama yang menjadi gerbang utama keamanan aplikasi. Karyawan harus memiliki akun untuk bisa mengakses *dashboard* manajemen penyewaan.
- **Fungsi:** Autentikasi dan identifikasi peran (Admin/Supir) serta penetapan identitas cabang asal bagi pengguna.
- **Input Fields:**
  - **ID Karyawan / Email**: *(Text/Email)* Identitas Karyawan terdaftar.
  - **Password**: *(Password)* Kata sandi unik milik Karyawan.

## 2. Form Kelola Pelanggan (`customers.html`)
Form dinamis yang muncul di dalam modal untuk mendaftarkan penyewa baru atau memperbarui data diri penyewa yang sudah ada (misalnya perubahan nomor telepon atau alamat).
- **Fungsi:** Mengelola data pelanggan cabang.
- **Input Fields:**
  - **Nama Lengkap**: *(Text)* Nama lengkap sesuai KTP.
  - **Nomor KTP (NIK)**: *(Text)* 16-digit nomor identitas utama.
  - **Nomor SIM**: *(Text)* Nomor identitas mengemudi.
  - **Telepon**: *(Text)* Nomor HP yang bisa dihubungi.
  - **Email**: *(Email)* Alamat surat elektronik.
  - **Alamat Lengkap**: *(Text)* Alamat tempat tinggal saat ini.

## 3. Form Kelola Karyawan (`employees.html`)
Form modal untuk administrasi SDM (Sumber Daya Manusia) di tingkat cabang. Digunakan untuk mendaftarkan Admin (kasir) baru maupun Driver (supir mutasi antar-cabang).
- **Fungsi:** Mengelola pendaftaran dan data gaji para karyawan.
- **Input Fields:**
  - **Nama Lengkap**: *(Text)* Nama asli Karyawan.
  - **Peran (Role)**: *(Dropdown/Select)* Pilihan antara `Admin` atau `Driver`.
  - **Gaji**: *(Number)* Gaji pokok bulanan Karyawan.
  - **Telepon**: *(Text)* Nomor telepon Karyawan.
  - **Email**: *(Email)* Email operasional Karyawan.
  - **Password**: *(Password)* Diisi untuk pengaturan awal atau pembaruan kata sandi (Hanya wajib bagi `Admin`).

## 4. Form Kelola Kendaraan (`vehicles.html`)
Pusat manajemen aset cabang. Form ini dipakai ketika cabang membeli/mendapatkan alokasi mobil baru, atau saat harus mengubah harga sewa hariannya.
- **Fungsi:** Registrasi armada mobil baru beserta rincian spesifikasinya.
- **Input Fields:**
  - **Merek**: *(Text)* *Brand* kendaraan (misal: Toyota, Honda).
  - **Model**: *(Text)* Tipe mobil (misal: Avanza, Brio).
  - **Tahun**: *(Number)* Tahun perakitan mobil.
  - **Plat Nomor**: *(Text)* Nomor polisi unik kendaraan (Tidak boleh duplikat).
  - **Kategori**: *(Dropdown/Select)* Tipe karoseri mobil (Contoh: SUV, MPV, Sedan, Hatchback).
  - **Transmisi**: *(Dropdown/Select)* Automatic / Manual.
  - **Kapasitas Kursi**: *(Number)* Jumlah total bangku penumpang.
  - **Harga Sewa / Hari**: *(Number)* Patokan biaya rental selama 24 jam (dalam Rupiah).

## 5. Form Buat Transaksi Lokal (`rentals.html`)
Form yang muncul dari *dashboard* Penyewaan (*Rentals*). Berfungsi untuk membuat kerangka penagihan (invoice) baru bagi pelanggan yang datang ke cabang.
- **Fungsi:** Membuat order penyewaan baru.
- **Input Fields:**
  - **Pelanggan**: *(Dropdown/Select)* Memilih dari daftar nama pelanggan yang sudah teregistrasi di cabang.
  - **Kendaraan**: *(Dropdown/Select)* Memilih kendaraan lokal (milik sendiri) yang statusnya sedang `Available`.
  - **Tanggal Mulai**: *(Date)* Tanggal pelanggan mulai menggunakan mobil.
  - **Total Durasi**: *(Number)* Jumlah hari penyewaan.

## 6. Form Edit Transaksi (`rentals.html`)
Form sekunder di halaman Penyewaan yang aktif hanya untuk transaksi berstatus `Pending Payment`. Ini berguna jika pelanggan mendadak ingin ganti mobil, menambah durasi hari, atau mengubah tanggal mulainya sebelum mereka mentransfer uangnya.
- **Fungsi:** Merevisi kontrak sewa (*invoice*) yang masih berstatus tunda bayar.
- **Input Fields:**
  - **Pelanggan**: *(Dropdown/Select)* Bisa diganti (Meski jarang terjadi).
  - **Kendaraan**: *(Dropdown/Select)* Mengubah mobil.
  - **Tanggal Mulai**: *(Date)*
  - **Total Durasi**: *(Number)*
  - **Lokasi Ambil (Pickup)**: *(Opsional)* Jika ternyata ini adalah transaksi lintas-cabang yang diedit, akan ada opsi khusus untuk memindah lokasi serah-terimanya.

## 7. Form Request Pengambilan Lintas Cabang (`rentals.html`)
Form ini tidak muncul di menu umum, melainkan hanya tampil saat pengguna mencoba me-*request* ketersediaan mobil dari tab pencarian **Lintas Cabang** (Cross Branch Shopping).
- **Fungsi:** Memutuskan di mana transaksi serah-terima kunci mobil fisik tersebut akan dilakukan (Apakah mobilnya yang disuruh datang, atau pelanggannya yang menjemput mobilnya).
- **Input Fields:**
  - **Cabang Pengambilan (Pickup Branch)**: *(Radio Button)* Daftar pilihan cabang yang tersambung di jaringan P2P (Termasuk opsi "Lokasi Anda Saat Ini").
  
---
*(Dokumen selesai - Semua komponen form UI telah didata.)*
