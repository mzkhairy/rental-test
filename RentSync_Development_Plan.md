# RentSync — Development Plan
### Peer-to-Peer Distributed Car Rental Management System

> Dokumen ini adalah panduan teknis untuk memulai pengembangan, hasil diskusi arsitektur berdasarkan `Draft_Project_rental.md`. Tidak ada penambahan fitur di luar scope draft, kecuali penyesuaian kecil pada skema `employees` (salary, homeBranch/currentBranch) untuk kebutuhan seeding data yang realistis.

---

## 1. Ringkasan Proyek

RentSync adalah sistem rental mobil dengan 5 cabang (Jakarta, Bogor, Depok, Tangerang, Bekasi) yang masing-masing memiliki backend, frontend, dan database sendiri. Komunikasi antar cabang (pencarian kendaraan & transfer) dilakukan langsung via REST API antar node, tanpa server pusat. Studi kasus utama: **transfer kendaraan antar cabang** ketika kendaraan yang diminta tidak tersedia di cabang asal.

---

## 2. Tech Stack

| Layer | Teknologi | Catatan |
|---|---|---|
| Runtime | Node.js | |
| Web framework | Express.js | 1 app per cabang, serve static frontend + REST API |
| Database | MongoDB Replica Set (`rsRental`) | 1 Primary + 4 Secondary, tersebar di 5 device fisik |
| ODM | Mongoose | schema validation untuk 6 collection |
| Frontend | HTML + CSS + Vanilla JS | fetch API, tanpa framework/bundler |
| Auth | express-session + bcrypt | session-based, password dummy di-hash |
| Komunikasi antar cabang | REST HTTP (axios) | backend-to-backend, langsung via IP:port |
| Deployment | 5 device fisik, 1 switch, IP statis | sesuai tabel IP pada draft |

**Catatan arsitektur (penting untuk dijelaskan saat presentasi):** Replica Set MongoDB menangani **replikasi/sinkronisasi data** (bukan P2P murni di level database — tetap ada 1 Primary). Konsep **peer-to-peer** didemonstrasikan di **layer API antar cabang**: setiap backend cabang bisa langsung memanggil backend cabang lain via IP address tanpa melalui server pusat. Kedua konsep ini saling melengkapi, bukan kontradiktif.

---

## 3. Arsitektur Deployment

```
Device Jakarta (192.168.1.2:27023) ── Express App + Mongo (Primary/Secondary)
Device Bogor     (192.168.1.6:27022) ── Express App + Mongo (Primary/Secondary)
Device Depok     (192.168.1.4:27025) ── Express App + Mongo (Primary/Secondary)
Device Tangerang (192.168.1.5:27026) ── Express App + Mongo (Primary/Secondary)
Device Bekasi    (192.168.1.3:27024) ── Express App + Mongo (Primary/Secondary)

Kelima device terhubung melalui 1 switch fisik, IP statis.
```

- **Satu codebase** untuk semua cabang — dibedakan lewat file `.env` per device (`BRANCH_CODE`, `PORT`, `MONGO_URI`, dst). Deploy ke device baru = clone repo + set `.env`.
- Setiap Express app serve static frontend (`express.static`) sekaligus expose REST API di port yang sama.

---

## 4. Struktur Project (per device, codebase identik)

```
rentsync/
├── .env                        # config khusus device ini
├── package.json
├── server.js                   # entry point
├── config/
│   └── db.js                   # koneksi ke Replica Set
├── models/
│   ├── Branch.js
│   ├── Vehicle.js
│   ├── Customer.js
│   ├── Employee.js
│   ├── Rental.js
│   └── Transfer.js
├── routes/
│   ├── auth.js
│   ├── vehicles.js
│   ├── customers.js
│   ├── employees.js
│   ├── rentals.js
│   └── transfers.js            # termasuk endpoint antar-cabang
├── middleware/
│   └── requireAuth.js
├── seeders/
│   └── seed.js                 # seeding data dummy (lihat bagian 6)
└── public/                     # frontend statis
    ├── login.html
    ├── dashboard.html
    ├── vehicles.html
    ├── customers.html
    ├── employees.html
    ├── rentals.html
    ├── transfers.html
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js              # wrapper fetch()
        ├── dashboard.js
        ├── vehicles.js
        ├── customers.js
        ├── employees.js
        ├── rentals.js
        ├── transfers.js
        └── notifications.js    # refetch notif tiap page load
```

---

## 5. Environment Configuration

Contoh `.env` untuk device Bogor:

```env
BRANCH_CODE=BGR
BRANCH_NAME=Bogor
PORT=27022
HOST_IP=192.168.1.6
MONGO_URI=mongodb://192.168.1.3,192.168.1.2,192.168.1.6,192.168.1.4,192.168.1.5/rentsync?replicaSet=rsRental
SESSION_SECRET=rentsync-demo-secret
```

Tabel IP seluruh cabang (dari draft):

| Cabang | Hostname | IP Address | Port |
|---|---|---|---|
| Jakarta | node-jkt | 192.168.1.2 | 27023 |
| Bogor | node-bgr | 192.168.1.6 | 27022 |
| Depok | node-dpk | 192.168.1.4 | 27025 |
| Tangerang | node-tgr | 192.168.1.5 | 27026 |
| Bekasi | node-bks | 192.168.1.3 | 27024 |

Setiap backend menyimpan tabel routing cabang lain (bisa hardcode di `.env` atau di-load dari collection `branches` saat startup) untuk keperluan pemanggilan API antar cabang.

---

## 6. Database Design

### 6.1 Setup Replica Set

```js
rs.initiate({
  _id: "rsRental",
  members: [
    { _id: 0, host: "192.168.1.2:27023" }, // Jakarta - Primary
    { _id: 1, host: "192.168.1.6:27022" }, // Bogor
    { _id: 2, host: "192.168.1.4:27025" }, // Depok
    { _id: 3, host: "192.168.1.5:27026" }, // Tangerang
    { _id: 4, host: "192.168.1.3:27024" }  // Bekasi
  ]
})
```

### 6.2 Collections

**branches** — sesuai draft, tanpa perubahan.

**vehicles** — sesuai draft, tanpa perubahan.
Status: `Available`, `Reserved`, `Rented`, `Transfer`, `Maintenance`

**customers** — sesuai draft, tanpa perubahan.

**employees** — *disesuaikan* (field baru ditandai 🆕):

| Field | Tipe | Keterangan |
|---|---|---|
| employeeCode | String | unik |
| fullName | String | unik per cabang |
| branchCode | String | |
| role | String | `Manager` \| `Admin` \| `Driver` |
| phone, email | String | |
| password 🆕 | String (hashed, bcrypt) | dummy, untuk login |
| salary 🆕 | Number | lihat aturan di bagian 7 |
| homeBranch 🆕 | String | khusus role `Driver` |
| currentBranch 🆕 | String | khusus role `Driver`, berubah saat ditugaskan ke cabang lain |
| status | String | |
| createdAt, updatedAt | Date | |

**rentals** — sesuai draft, tanpa perubahan.
Status: `Pending`, `Waiting Transfer`, `Active`, `Completed`, `Cancelled`

**transfers** — sesuai draft, tanpa perubahan.
Status: `Requested`, `Approved`, `Rejected`, `In Transit`, `Arrived`, `Cancelled`

---

## 7. Aturan Seeding Data (agar "make sense")

**Jumlah employee per cabang:**
- Manager: 1
- Admin: 2
- Driver: 4–5

**Hierarki gaji** (Manager selalu paling tinggi):

| Role | Range gaji (contoh) |
|---|---|
| Manager | Rp 12.000.000 – 14.000.000 |
| Admin | Rp 6.000.000 – 7.000.000 |
| Driver | Rp 4.500.000 – 5.500.000 |

**Aturan lain:**
- `fullName` tidak boleh duplikat **lintas seluruh cabang** (gunakan daftar nama unik, di-generate sekali lalu didistribusikan ke 5 cabang tanpa pengulangan).
- `employeeCode` format: `{BRANCH_CODE}-{ROLE_INITIAL}-{seq}` misal `JKT-DRV-01`.
- Driver: `homeBranch` = cabang asal saat pertama kali di-seed. `currentBranch` = sama dengan `homeBranch` di kondisi awal (berubah hanya jika ada skenario driver ikut mengantar kendaraan transfer — opsional, tidak wajib untuk MVP demo).
- Password dummy: satu password default (misal `Rentsync123!`) di-hash dengan bcrypt untuk semua akun — cukup untuk demo login yang "terasa nyata" tanpa menambah kompleksitas.
- Vehicles: distribusi merek/model bervariasi per cabang, minimal 1 unit "kendaraan kunci" (misal Toyota Fortuner) hanya ada di Jakarta — untuk mendukung skenario demo di bagian 13 draft.

---

## 8. Autentikasi

- Login via form (`login.html`) → POST `/api/auth/login` → cek `email`/`employeeCode` + password (bcrypt compare) ke collection `employees` cabang tersebut.
- Session disimpan server-side (`express-session`), cookie per cabang (karena tiap cabang punya domain/IP:port sendiri, session tidak perlu di-share antar cabang).
- Akses ke web cukup dilakukan oleh admin saja, role lain hanya sebagai dummy data di database, jadi login menggunakan admin di masing-masing cabang.

---

## 9. Struktur UI (Frontend)

**Layout:** Sidebar kiri (fixed) + Topbar (kanan atas: bell notifikasi + avatar user).

**7 halaman:**

1. **Login** — form email/employeeCode + password
2. **Dashboard** — 4 stat card: Total Kendaraan, Kendaraan Tersedia, Rental Aktif, Transfer Aktif
3. **Vehicles** — list + modal tambah/edit dan delete
4. **Customers** — CRUD
5. **Employees** — CRUD
6. **Rentals** — tab: Buat Rental | Pengembalian | Riwayat
7. **Transfers** — tab: Cari Kendaraan & Request Keluar | Request Masuk | Riwayat

**Notifikasi bell:**
- Refetch **manual** — dipanggil setiap kali halaman di-load/pindah halaman (bukan polling interval), lewat `GET /api/transfers/incoming?status=Requested`.
- Badge angka = jumlah request masuk berstatus `Requested` yang belum diproses.
- Klik bell → dropdown list singkat (3–5 item terbaru) → klik salah satu → redirect ke halaman **Transfers**, tab "Request Masuk", auto-scroll/highlight ke item terkait (bisa pakai query param `?highlight={transferId}`).

---

## 10. API Endpoints

**CRUD internal (tiap cabang, prefix `/api`):**
```
/auth/login, /auth/logout
/vehicles (GET, POST, PUT, DELETE)
/customers (GET, POST, PUT, DELETE)
/employees (GET, POST, PUT, DELETE)
/rentals (GET, POST, PUT)
```

**Antar cabang (sesuai draft, dipanggil backend-to-backend via IP):**
```
GET  /api/vehicles/available
POST /api/transfers/request
POST /api/transfers/approve
POST /api/transfers/reject
POST /api/transfers/depart
POST /api/transfers/arrive
GET  /api/transfers/incoming
GET  /api/transfers/history
```

---

## 11. Checklist Verifikasi Alur Bisnis

Sebelum demo, setiap alur berikut wajib diverifikasi end-to-end pada database masing-masing cabang:

- [ ] **Login** — session tersimpan, role tampil benar di topbar
- [ ] **Rental Normal** — kendaraan tersedia → rental dibuat → `vehicle.status = Rented` → `rental.status = Active`, hanya mengubah DB cabang tersebut
- [ ] **Rental Antar Cabang (Bogor → Jakarta)**:
  - [ ] Bogor cari kendaraan, tidak tersedia lokal
  - [ ] Bogor cari ke cabang lain via `GET /vehicles/available`
  - [ ] Bogor kirim `POST /transfers/request` ke Jakarta
  - [ ] Notifikasi bell di Jakarta menunjukkan request baru (setelah reload/pindah halaman)
  - [ ] Jakarta approve → `vehicle.status = Transfer` (di DB Jakarta)
  - [ ] Simulasi kendaraan tiba → Bogor konfirmasi arrival → `vehicle.status = Rented`, `rental.status = Active`
  - [ ] Verifikasi perubahan data di **kedua** database (Bogor: `transfers`, `rentals`; Jakarta: `transfers`, `vehicles`)
- [ ] **Reject Transfer** — Jakarta reject → `transfer.status = Rejected`, `vehicle.status` kembali `Available`
- [ ] **Pengembalian** — kendaraan dikembalikan di cabang berbeda dari asal → `rental.status = Completed`, `vehicle.currentBranch` berubah, `vehicle.homeBranch` tetap
- [ ] **Replikasi** — tulis data di Primary, verifikasi data muncul di Secondary (cek dari device lain)
- [ ] **Kegagalan node** — matikan salah satu device, pastikan 4 device lain tetap bisa transaksi normal (kecuali transaksi yang butuh node tsb)

---

## 12. Mode Testing Lokal (Single Device — Sementara, Belum Ada Switch Fisik)

Untuk tahap development & testing flow aplikasi, seluruh 5 node disimulasikan dalam **1 laptop/PC** menggunakan port berbeda per cabang. Setelah switch & 5 device fisik tersedia, tinggal pindah konfigurasi tanpa refactor kode.

**MongoDB — tetap 1 Replica Set `rsRental`**, hanya host berubah dari IP LAN ke `127.0.0.1`:

```bash
mongod --replSet rsRental --port 27021 --dbpath ./data/jkt
mongod --replSet rsRental --port 27022 --dbpath ./data/bgr
mongod --replSet rsRental --port 27023 --dbpath ./data/dpk
mongod --replSet rsRental --port 27024 --dbpath ./data/tgr
mongod --replSet rsRental --port 27025 --dbpath ./data/bks
```

```js
rs.initiate({
  _id: "rsRental",
  members: [
    { _id: 0, host: "127.0.0.1:27021" }, // Jakarta - Primary
    { _id: 1, host: "127.0.0.1:27022" }, // Bogor
    { _id: 2, host: "127.0.0.1:27023" }, // Depok
    { _id: 3, host: "127.0.0.1:27024" }, // Tangerang
    { _id: 4, host: "127.0.0.1:27025" }  // Bekasi
  ]
})
```

**Backend Express — 5 instance, port berbeda, 1 codebase:**

| Cabang | `.env` file | PORT |
|---|---|---|
| Jakarta | `.env.jkt` | 4001 |
| Bogor | `.env.bgr` | 4002 |
| Depok | `.env.dpk` | 4003 |
| Tangerang | `.env.tgr` | 4004 |
| Bekasi | `.env.bks` | 4005 |

Jalankan tiap instance dengan env file masing-masing (mis. via `dotenv-cli`: `dotenv -e .env.jkt -- node server.js`).

**Inter-branch call**: base URL antar cabang cukup `http://localhost:{PORT}` menggantikan `http://{IP_LAN}:{PORT}` — logic kode tidak berubah sama sekali.

**Transisi ke device fisik nanti**: hanya ganti `HOST_IP` & `MONGO_URI` di tiap `.env` dari `127.0.0.1:PORT` ke IP LAN asli, lalu jalankan **1 instance per device** (bukan 5 dalam 1 device). Tidak ada perubahan kode aplikasi.

---

## 13. Roadmap Development

**Tahap 1 — Infrastruktur**
- **Saat ini (belum ada switch):** jalankan 5 instance MongoDB lokal di `127.0.0.1` (port berbeda) sesuai bagian 12, `rs.initiate()` dengan host localhost
- **Nanti (switch & device fisik siap):** pindahkan ke 5 device fisik + IP statis, ganti `.env`, tanpa ubah kode
- Verifikasi konektivitas (ping + koneksi Mongo antar member replica set)

**Tahap 2 — Database & Seeder**
- Definisikan schema Mongoose (6 collection)
- Buat `seeders/seed.js` sesuai aturan bagian 7
- Jalankan seeder di tiap device dengan data spesifik cabangnya

**Tahap 3 — Backend API**
- CRUD seluruh collection
- Endpoint auth (login/logout, session, bcrypt)
- Endpoint antar cabang (`transfers/*`, `vehicles/available`)

**Tahap 4 — Frontend**
- Layout sidebar + topbar + bell (static HTML/CSS)
- 7 halaman + `js/api.js` wrapper fetch
- Notifikasi manual refetch on page load

**Tahap 5 — Integrasi & Testing**
- Jalankan checklist di bagian 11 pada seluruh 5 device
- Uji skenario normal, lintas cabang, dan kegagalan node
- Latihan skenario demo presentasi (sesuai bagian 13 draft asli)

---


