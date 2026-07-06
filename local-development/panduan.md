# Panduan Local Development & GitHub Workflow

Dokumen ini berisi panduan lengkap untuk melakukan pengembangan fitur secara lokal (semua 5 cabang berjalan di satu PC menggunakan `localhost`), serta panduan menggunakan Git/GitHub dengan cabang (*branch*) terpisah.

---

## 1. Setup Local Development

Fitur ini berguna ketika Anda ingin mengembangkan aplikasi sendirian di satu laptop tanpa perlu tersambung ke jaringan ZeroTier atau Local Switch. 

> [!NOTE]  
> Skrip `setup_local.ps1` akan menghapus (wipe-out) data MongoDB lokal lama Anda (`data/local_bks`, dsb) dan membuat ulang data *dummy* dari awal agar kondisinya selalu bersih (fresh).

### Langkah Menjalankan Setup Lokal:
1. Klik tombol **Windows (Start)**, ketik `PowerShell`.
2. Di sebelah kanan, klik **"Run as Administrator"**.
3. Arahkan PowerShell ke folder project Anda, misal:
   ```powershell
   cd D:\sbdt\rental
   ```
4. Jalankan script setup lokal:
   ```powershell
   .\local-development\setup_local.ps1
   ```
5. Tunggu hingga proses selesai. Script ini akan secara otomatis:
   - Menyiapkan 5 instance MongoDB secara lokal.
   - Meng-generate file `.env` untuk masing-masing cabang.
   - Melakukan *seeding* data dummy otomatis.

### Menjalankan Kelima Server Sekaligus
Alih-alih menjalankan `npm start` 5 kali secara manual, Anda cukup menggunakan script khusus berikut:
```powershell
.\local-development\start_servers.ps1
```
Script ini akan langsung **membuka 5 jendela terminal baru**; masing-masing menjalankan Node.js untuk cabang Bekasi, Bogor, Depok, Jakarta, dan Tangerang secara independen di port `4001` hingga `4005`.

untuk buka UI web-appnya:
jakarta = http://localhost:4001/login.html
bogor = http://localhost:4002/login.html
depok = http://localhost:4003/login.html
tangerang = http://localhost:4004/login.html
bekasi = http://localhost:4005/login.html
**KALO MAU BUKA LEBIH DARI 1 BERSAMAAN BUKANYA DI WINDOW WEB YANG BERBEDA PROFILE (KALO DI CHROME BERARTI BEDA CHROME PROFILE), JANGAN PADA SATU WINDOW ATAU BEDA TAB DOANG**
---

## 2. Kembali ke Mode P2P (Produksi)

Ketika Anda sudah selesai mengembangkan fitur lokal dan ingin melakukan pengetesan antar-perangkat (menggunakan ZeroTier/Switch):

1. Hentikan (tutup) semua 5 jendela terminal Node.js yang sedang menyala.
2. Buka PowerShell (Administrator), lalu jalankan script setup aslinya:
   ```powershell
   .\setup_device.ps1
   ```
3. Ikuti instruksi di layar (pilih nama cabang, pilih network ZeroTier/Switch).
4. Jalankan server Node.js secara normal:
   ```powershell
   npm start
   ```

---

## 3. Panduan GitHub (Sistem Bercabang)

Karena Anda akan mengerjakan dua fitur terpisah (misalnya Keuangan dan Snapshot), Anda harus menggunakan Git *Branch* agar kode tidak saling bertabrakan atau rusak.

### Skenario A: Mengerjakan Fitur Keuangan
1. **Pastikan berada di cabang utama (main) dan mendapatkan kode terbaru:**
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Buat cabang baru bernama `feat-keuangan` (atau masuk jika sudah ada):**
   ```bash
   git checkout -b feat-keuangan
   ```
   *(Jika cabang sudah pernah dibuat sebelumnya, hapus `-b` menjadi `git checkout feat-keuangan`)*
3. **Mulai Ngoding!** (Lakukan perubahan pada file yang bersangkutan).
4. **Simpan dan Unggah Perubahan:**
   ```bash
   git add .
   git commit -m "Menambahkan fitur laporan keuangan"
   git push origin feat-keuangan
   ```

### Skenario B: Mengerjakan Fitur Snapshot
1. **Kembali dulu ke cabang utama:**
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Buat cabang baru bernama `feat-snapshot`:**
   ```bash
   git checkout -b feat-snapshot
   ```
3. **Mulai Ngoding Fitur Snapshot!**
4. **Simpan dan Unggah Perubahan:**
   ```bash
   git add .
   git commit -m "Membuat fitur snapshot database harian"
   git push origin feat-snapshot
   ```

> [!TIP]  
> Menggunakan cara ini, *error* yang mungkin Anda buat saat membuat fitur Snapshot tidak akan merusak kode fitur Keuangan, begitupun sebaliknya. Setelah kode benar-benar aman, barulah Anda bisa melakukan *Pull Request* (Merge) di website GitHub ke dalam cabang `main`.
