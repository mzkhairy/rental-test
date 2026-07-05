**Draft Awal Proyek**

**RentSync - Peer-to-Peer Distributed Car Rental Management System**

**1\. Latar Belakang**

Perusahaan rental mobil yang memiliki banyak cabang menghadapi tantangan dalam mengelola ketersediaan kendaraan secara real-time. Setiap cabang harus dapat melayani pelanggan secara mandiri, namun tetap dapat bekerja sama dengan cabang lain ketika kendaraan yang dibutuhkan tidak tersedia di lokasi tersebut.

Pada sistem konvensional, seluruh cabang biasanya bergantung pada satu server pusat (client-server). Pendekatan ini memiliki beberapa kelemahan:

- Single Point of Failure.
- Beban server pusat semakin besar seiring bertambahnya cabang.
- Jika server pusat mengalami gangguan, seluruh operasional dapat terganggu.
- Seluruh komunikasi harus melalui server pusat meskipun hanya melibatkan dua cabang.

Sebagai alternatif, proyek ini mengimplementasikan **sistem basis data terdistribusi berbasis Peer-to-Peer**, di mana setiap cabang memiliki database dan backend sendiri. Setiap cabang dapat berkomunikasi langsung dengan cabang lain untuk melakukan transaksi tanpa memerlukan server pusat sebagai perantara.

Kasus utama yang diangkat adalah **transfer kendaraan antar cabang** untuk memenuhi permintaan pelanggan ketika kendaraan yang diinginkan tidak tersedia di cabang asal.

**2\. Tujuan**

Membangun sistem rental mobil yang mampu:

- Mengimplementasikan sistem basis data terdistribusi.
- Menggunakan arsitektur Peer-to-Peer.
- Memungkinkan transaksi langsung antar database cabang.
- Menjaga konsistensi data kendaraan antar cabang.
- Mendemonstrasikan sinkronisasi data melalui MongoDB Replica Set.

**3\. Studi Kasus**

Perusahaan memiliki lima cabang:

Jakarta  
Bogor  
Depok  
Tangerang  
Bekasi

Setiap cabang memiliki:

- Database MongoDB sendiri
- Backend API sendiri
- Frontend sendiri (atau frontend yang dapat memilih cabang)
- Alamat IP sendiri

Contoh:

| **Cabang** | **Hostname** | **IP Address** | **Port** |     |     |
| ---------- | ------------ | -------------- | -------- | --- | --- |
| Jakarta    | node-jkt     | 192.168.1.2    | 27023    |     |     |
| Bogor      | node-bgr     | 192.168.1.6    | 27022    |     |     |
| Depok      | node-dpk     | 192.168.1.4    | 27025    |     |     |
| Tangerang  | node-tgr     | 192.168.1.5    | 27026    |     |     |
| Bekasi     | node-bks     | 192.168.1.3    | 27024    |     |     |

**4\. Arsitektur Sistem**

Peer-to-Peer Network  
Jakarta &lt;---------&gt; Bogor  
▲ \\ / ▲  
│ \\ / │  
│ \\ / │  
│ \\ / │  
Depok &lt;-------&gt; Bekasi  
\\ /  
\\ /  
\\ /  
Tangerang

Karakteristik:

- Tidak ada server pusat.
- Seluruh node setara.
- Setiap node dapat mengirim maupun menerima request.
- Komunikasi dilakukan langsung menggunakan IP Address masing-masing.

**5\. Infrastruktur**

**MongoDB**

Setiap cabang menjalankan:

MongoDB  
Replica Set Member

Contoh Replica Set

rsRental  
├── Jakarta  
├── Bogor  
├── Depok  
├── Tangerang  
└── Bekasi

Setiap node mengetahui alamat node lain.

Misalnya:

mongodb://  
192.168.1.3,  
192.168.1.2,  
192.168.1.6,  
192.168.1.4,  
192.168.1.5  
/?replicaSet=rsRental

**Catatan penting:** Untuk implementasi nyata, perlu dipahami bahwa satu **Replica Set MongoDB** secara bawaan memiliki **satu Primary dan beberapa Secondary**, sehingga arsitektur ini **bukan peer-to-peer murni pada level database**. Jika dosen benar-benar mensyaratkan peer-to-peer, sebaiknya gunakan **lima database MongoDB yang berdiri sendiri**, lalu komunikasi peer-to-peer dilakukan melalui API antar cabang. Replica Set lebih tepat digunakan untuk **high availability dan replikasi**, bukan untuk menghilangkan konsep primary-secondary.

**6\. Arsitektur Aplikasi**

Setiap cabang memiliki aplikasi yang sama.

Frontend  
↓  
Backend API  
↓  
MongoDB

Backend setiap cabang memiliki endpoint untuk menerima request dari cabang lain.

**7\. Database**

Setiap cabang memiliki collection yang sama.

branches  
vehicles  
customers  
employees  
rentals  
transfers

**8\. Struktur Collection**

**branches**

\_id  
branchCode  
branchName  
city  
address  
host  
apiPort  
databaseName  
status  
createdAt  
updatedAt

**vehicles**

\_id  
vehicleCode  
plateNumber  
brand  
model  
year  
category  
transmission  
seatCapacity  
dailyRate  
homeBranch  
currentBranch  
status  
odometer  
lastService  
createdAt  
updatedAt

Status

Available  
Reserved  
Rented  
Transfer  
Maintenance

**customers**

\_id  
customerCode  
fullName  
identityNumber  
driverLicense  
phone  
email  
address  
createdAt  
updatedAt

**employees**

\_id  
employeeCode  
fullName  
branchCode  
role  
phone  
email  
status  
createdAt  
updatedAt

**rentals**

\_id  
rentalCode  
customerId  
vehicleId  
pickupBranch  
returnBranch  
handledBy  
startDate  
expectedReturnDate  
actualReturnDate  
totalDays  
totalPrice  
status  
createdAt  
updatedAt

Status

Pending  
Waiting Transfer  
Active  
Completed  
Cancelled

**transfers**

\_id  
transferCode  
vehicleId  
fromBranch  
toBranch  
requestedBy  
approvedBy  
requestDate  
departureDate  
arrivalDate  
status  
notes  
createdAt  
updatedAt

Status

Requested  
Approved  
Rejected  
In Transit  
Arrived  
Cancelled

**9\. Alur Sistem**

**A. Rental Normal**

Customer  
↓  
Pilih Mobil  
↓  
Mobil tersedia  
↓  
Buat Rental  
↓  
Status Mobil = Rented  
↓  
Rental = Active

Hanya terjadi pada database cabang tersebut.

**B. Rental Antar Cabang**

Misal:

Customer datang ke Bogor.

Bogor tidak memiliki Toyota Fortuner.

Langkah:

Customer  
↓  
Bogor  
↓  
Cari kendaraan  
↓  
Tidak tersedia  
↓  
Cari ke cabang lain  
↓  
Jakarta memiliki kendaraan  
↓  
Bogor mengirim Request Transfer  
↓  
Jakarta menerima request  
↓  
Approve  
↓  
Status kendaraan = Transfer  
↓  
Mobil dikirim  
↓  
Bogor konfirmasi kendaraan diterima  
↓  
Status kendaraan = Rented  
↓  
Rental Active

Database yang berubah:

Bogor

- transfers
- rentals

Jakarta

- transfers
- vehicles

**C. Pengembalian**

Customer mengembalikan mobil di Bekasi.

Bekasi  
↓  
Terima kendaraan  
↓  
Rental Completed  
↓  
Vehicle.currentBranch = Bekasi

Kendaraan tetap memiliki:

homeBranch = Jakarta  
currentBranch = Bekasi

**10\. Komunikasi Antar Cabang**

Contoh komunikasi:

Bogor  
↓  
POST  
<http://192.168.1.10:3000/api/transfers/request>

Jakarta memproses.

Kemudian mengirim response.

HTTP 200  
Approved

Tidak melalui server pusat.

**11\. Modul Frontend**

**Dashboard**

- Total kendaraan
- Kendaraan tersedia
- Rental aktif
- Transfer aktif

**Vehicle Management**

- List kendaraan
- Tambah kendaraan
- Edit kendaraan
- Status kendaraan
- Lokasi kendaraan

**Customer Management**

- CRUD Customer

**Employee Management**

- CRUD Employee

**Rental Management**

- Buat rental
- Pengembalian
- Riwayat rental

**Transfer Management (Fitur Utama)**

- Cari kendaraan cabang lain
- Request transfer
- Approve transfer
- Reject transfer
- Konfirmasi kendaraan tiba
- Riwayat transfer

**12\. Endpoint Antar Cabang**

GET /vehicles/available  
POST /transfers/request  
POST /transfers/approve  
POST /transfers/reject  
POST /transfers/depart  
POST /transfers/arrive  
GET /transfers/history

**13\. Pembagian Demo Presentasi**

**Cabang Jakarta**

Memiliki Fortuner.

**Cabang Bogor**

Tidak memiliki Fortuner.

**Skenario**

- Login sebagai Admin Bogor.
- Customer ingin menyewa Fortuner.
- Bogor tidak memiliki unit.
- Sistem mencari kendaraan di cabang lain.
- Jakarta memiliki unit tersedia.
- Bogor mengirim Request Transfer.
- Login sebagai Admin Jakarta.
- Approve transfer.
- Status kendaraan menjadi **Transfer**.
- Simulasikan kendaraan tiba di Bogor.
- Status menjadi **Rented**.
- Rental berhasil dibuat.
- Tampilkan perubahan data pada kedua database.

**14\. Roadmap Development**

**Tahap 1**

- Konfigurasi 5 instance MongoDB.
- Konfigurasi jaringan antar node.
- Menentukan IP statis setiap cabang.
- (Opsional) Konfigurasi Replica Set untuk demonstrasi replikasi.

**Tahap 2**

- Pembuatan struktur database dan collection.
- Seeder data awal untuk lima cabang.

**Tahap 3**

- Pengembangan Backend API.
- CRUD seluruh collection.
- API komunikasi antar cabang.

**Tahap 4**

- Pengembangan Frontend.
- Dashboard.
- CRUD.
- Modul transfer kendaraan.

**Tahap 5**

- Implementasi sinkronisasi transaksi antar cabang.
- Pengujian skenario normal.
- Pengujian transaksi lintas cabang.
- Pengujian kegagalan (misalnya request ditolak atau salah satu node tidak dapat dihubungi).