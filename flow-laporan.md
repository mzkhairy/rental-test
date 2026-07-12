# Draft Laporan: Alur Logistik & Penyewaan RentSync

Dokumen ini berisi daftar lengkap status pada *collections* utama, skenario penggunaan (*use cases*), serta penjelasan kolom (field) pada setiap *collection* di database.

## 1. Daftar Status

### A. Status Kendaraan (Vehicle)
| Status | Kapan Muncul / Berubah |
|---|---|
| **Available** | Saat kendaraan siap untuk disewa (berada di cabang asalnya dan tidak ada yang meminjam). |
| **Reserved** | Saat kendaraan sudah di-*approve* untuk dikirim ke cabang peminjam, atau saat mobil telah tiba (`Arrived`) di cabang tujuan namun belum diserahkan ke pelanggan. |
| **Booked** | Saat transaksi lokal sedang dalam tahap `Pending Payment`. |
| **Rented** | Saat kendaraan sedang digunakan oleh penyewa dalam transaksi lokal (`Active`). |
| **Rented by Request** | Saat kendaraan sedang digunakan pelanggan, namun transaksinya berjenis lintas-cabang (cabang pemilik melihat status ini). |
| **Transfer** | Saat kendaraan dalam proses pengantaran antar-cabang (Namun di UI saat ini tidak terpakai aktif, digabung dengan flow `Transfer`). |
| **Maintenance** | Saat mobil sedang diperbaiki (fitur opsional). |

### B. Status Transfer (Request Lintas Cabang)
| Status | Kapan Muncul / Berubah |
|---|---|
| **Requested** | Saat cabang peminjam membuat *request* (belum dibayar oleh pelanggan). |
| **Approved** | Setelah pelanggan membayar transaksi (di cabang peminjam), maka cabang pemilik otomatis meng-*approve* dan memproses pengiriman. |
| **Rejected** | Jika cabang pemilik menolak permintaan sebelum di-*approve* (saat ini *auto-approve* jika tersedia). |
| **Arrived** | Saat cabang penerima mengeklik "Konfirmasi Tiba". Mobil fisik sudah ada di lokasi mereka. |
| **Started** | Saat cabang penerima mengeklik "Mulai Penyewaan" (kunci mobil diserahkan ke pelanggan). |
| **Rent Finished** | Saat cabang penerima mengeklik "Selesaikan Penyewaan" (pelanggan sudah mengembalikan mobil ke cabang tersebut, namun mobil belum dipulangkan ke cabang pemilik). |
| **Waiting Return** | Saat cabang penerima mengeklik "Kembalikan Kendaraan" (kunci mobil sedang dalam perjalanan kembali ke cabang pemilik). |
| **Completed** | Saat cabang pemilik mengeklik "Konfirmasi Pengembalian" (Mobil fisik sudah kembali ke cabang pemilik). |
| **Cancelled** | Jika pelanggan membatalkan pesanan sebelum dibayar. |

### C. Status Penyewaan (Rental)
| Status | Kapan Muncul / Berubah |
|---|---|
| **Pending Payment** | Awal mula transaksi dibuat, menunggu pelanggan membayar. |
| **Waiting Transfer** | Setelah dibayar (untuk lintas cabang), namun mobil belum tiba di cabang penerima. |
| **Waiting Handover** | (Khusus Lintas Cabang) Setelah mobil dikonfirmasi `Arrived` di cabang penerima, namun belum diserahkan ke pelanggan. |
| **Active** | Transaksi sedang berjalan (pelanggan sedang membawa mobil). Untuk lokal, langsung setelah bayar. Untuk lintas cabang, setelah klik "Mulai Penyewaan". |
| **Waiting Return** | Saat pelanggan telah selesai menyewa (Untuk penyewaan lintas cabang, status ini muncul jika pengembalian ke beda cabang dan menunggu konfirmasi). |
| **Completed** | Transaksi sepenuhnya selesai, mobil sudah dikembalikan. |
| **Cancelled** | Transaksi dibatalkan (misal: *cancel* sebelum pembayaran). |

---

## 2. Skenario Penyewaan

### Skenario 1: Penyewaan Lokal (Mobil Cabang A, Sewa di Cabang A, Kembali di Cabang A)
1. **Buat Transaksi**: Admin Cabang A membuat rental.
   - Rental Status: `Pending Payment`
   - Vehicle Status: `Booked`
2. **Konfirmasi Pembayaran**: Admin mengeklik tombol "Konfirmasi Payment".
   - Rental Status: `Active`
   - Vehicle Status: `Rented`
3. **Selesaikan Sewa**: Pelanggan mengembalikan mobil, Admin mengeklik "Selesaikan Sewa".
   - Rental Status: `Completed`
   - Vehicle Status: `Available`

### Skenario 2: Lintas Cabang - Sama Tempat Pengambilan & Pengembalian (Customer di A, Pinjam dari B, Kembali di A)
1. **Buat Request**: Cabang A me-request mobil dari Cabang B.
   - Rental Status (di A): `Pending Payment`
2. **Konfirmasi Pembayaran**: Cabang A menerima uang, lalu mengeklik "Konfirmasi Payment".
   - Rental Status (di A): `Waiting Transfer`
   - Transfer Status (di A & B): `Requested`
3. **Konfirmasi dari Cabang B**: Cabang B Approve request dari cabang A.
   - Transfer Status (di A & B): `Approved`
   - Vehicle Status (di B): `Transfer`
   - Rental Status (di A): `Waiting Transfer`
4. **Mobil Tiba**: Cabang A mengeklik "Konfirmasi Tiba" (Sub Menu Request).
   - Transfer Status: `Arrived`
   - Rental Status (di A): `Waiting Handover` menunggu diserahkan ke customer
   - Vehicle Status (di B): `Reserved`
5. **Mulai Penyewaan**: Pelanggan datang ke Cabang A, Mobil diserahkan dan Admin A mengeklik "Mulai Penyewaan" (Sub Menu Request).
   - Transfer Status: `Started`
   - Rental Status (di A): `Active`
   - Vehicle Status (di B): `Rented by Request`
6. **Penyewaan Selesai (Oleh Pelanggan)**: Pelanggan mengembalikan kendaraan ke Cabang A, Admin A mengeklik "Selesaikan Penyewaan" (Sub Menu Request).
   - Transfer Status: `Rent Finished`
   - Rental Status (di A): `Completed`
7. **Kembalikan Mobil (Oleh Cabang)**: Cabang A memulangkan mobil ke Cabang B, Admin A mengeklik "Kembalikan Kendaraan".
   - Transfer Status: `Waiting Return`
8. **Mobil Sampai di Pemilik**: Cabang B mengeklik "Konfirmasi Pengembalian" (Sub Menu Request).
   - Transfer Status: `Completed`
   - Vehicle Status (di B): `Available`

---

## 3. Struktur Database & Deskripsi Field

### A. Collection: `branches`
| Field | Deskripsi |
|---|---|
| `branchCode` | Kode unik cabang (misal: "A", "B"). |
| `branchName` | Nama cabang (misal: "Jakarta"). |
| `city` | Kota lokasi cabang. |
| `address` | Alamat lengkap cabang. |
| `host` | Alamat IP atau hostname untuk P2P (misal: 192.168.1.5 atau localhost). |
| `apiPort` | Port Node.js yang berjalan di cabang tersebut. |
| `databaseName` | Nama database MongoDB. |
| `status` | Status cabang (`Active`/`Inactive`). |

### B. Collection: `customers`
| Field | Deskripsi |
|---|---|
| `customerCode` | Kode unik pelanggan. |
| `fullName` | Nama lengkap pelanggan. |
| `identityNumber` | Nomor KTP / Identitas. |
| `driverLicense` | Nomor SIM pelanggan. |
| `phone`, `email`, `address` | Kontak dan alamat. |
| `branchCode` | Cabang tempat pelanggan terdaftar pertama kali. |
| `isRenting` | `Boolean` penanda jika pelanggan sedang aktif menyewa. |

### C. Collection: `employees`
| Field | Deskripsi |
|---|---|
| `employeeCode`, `fullName` | Kode dan nama lengkap pegawai. |
| `branchCode` | Cabang tempat pegawai ditugaskan. |
| `role` | Peran pegawai (`Admin`, `Driver`). |
| `phone`, `email`, `password` | Kontak dan kredensial akses. |
| `salary` | Gaji. |
| `homeBranch`, `currentBranch` | (Khusus Driver) Melacak posisi fisik supir. |
| `status` | `Active`/`Inactive`. |

### D. Collection: `vehicles`
| Field | Deskripsi |
|---|---|
| `vehicleCode`, `plateNumber` | Kode armada dan plat nomor. |
| `brand`, `model`, `year` | Merek, tipe, dan tahun kendaraan. |
| `category`, `transmission` | Kategori (SUV, Sedan) dan jenis transmisi. |
| `seatCapacity`, `dailyRate` | Kapasitas penumpang dan harga sewa harian. |
| `homeBranch` | Cabang pemilik sah dari kendaraan. |
| `currentBranch` | Lokasi fisik terkini kendaraan. |
| `status` | Kondisi ketersediaan kendaraan (Lihat tabel status). |
| `odometer`, `lastService` | Jarak tempuh dan tanggal servis terakhir. |

### E. Collection: `rentals`
| Field | Deskripsi |
|---|---|
| `rentalCode` | Nomor invoice / transaksi. |
| `customerId`, `vehicleId` | Referensi ke pelanggan dan kendaraan. |
| `pickupBranch`, `returnBranch` | Cabang tempat mobil diambil dan dipulangkan. |
| `handledBy` | Pegawai yang memproses transaksi. |
| `startDate`, `expectedRentFinishDate` | Rentang waktu penyewaan (sesuai invoice). |
| `actualReturnDate` | Tanggal riil mobil dikembalikan. |
| `totalDays`, `totalPrice` | Total hari dan harga yang dibayarkan. |
| `isCrossBranch` | Penanda jika transaksi melibatkan mobil dari cabang lain. |
| `ownerBranch`, `rentalBranch` | Cabang pemilik aset dan cabang pembuat invoice. |
| `transferId` | Referensi tiket pemindahan mobil (jika lintas cabang). |
| `status` | Kondisi berjalannya transaksi penyewaan (Lihat tabel status). |

### F. Collection: `transfers`
| Field | Deskripsi |
|---|---|
| `transferCode` | Nomor urut tiket pengiriman. |
| `vehicleId` | Kendaraan yang dikirim. |
| `vehicleName`, `vehiclePlate` | Cache info kendaraan untuk mempercepat bacaan UI. |
| `startDate`, `expectedRentFinishDate` | Referensi jadwal pemakaian. |
| `totalDays` | Jumlah durasi request. |
| `rentalBranch` | Cabang yang membuat transaksi (penagih invoice). |
| `fromBranch` | Cabang asal (pemilik) kendaraan. |
| `toBranch` | Cabang tujuan (lokasi mobil digunakan). |
| `requestedBy`, `approvedBy` | Admin pemohon dan yang menyetujui. |
| `departureDate`, `arrivalDate` | Waktu pengiriman dan penerimaan. |
| `status` | Tahapan proses perpindahan kendaraan (Lihat tabel status). |

### G. Collection: `notifications`
| Field | Deskripsi |
|---|---|
| `branchCode` | Cabang penerima notifikasi. |
| `title`, `message` | Judul dan isi pesan notifikasi. |
| `link` | Tautan navigasi UI jika diklik. |
| `isRead` | Penanda apakah notifikasi sudah dilihat. |
