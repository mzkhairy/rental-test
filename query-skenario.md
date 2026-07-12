# Kumpulan Query MongoDB - Skenario Lintas Cabang

Dokumen ini berisi *query* MongoDB (*Native mongosh/NoSQL*) yang merepresentasikan perubahan aliran data di *database* pada skenario penyewaan lintas cabang. Anda dapat memasukkan *query* ini ke dalam laporan Anda sebagai bukti pemahaman struktur data.

*Asumsi Skenario: Customer menyewa di Cabang A (Rental), meminjam mobil milik Cabang B (Owner).*

### 1. Buat Request Lintas Cabang (Di Database Cabang A)
Ketika kasir Cabang A membuat tagihan (invoice) yang melibatkan mobil Cabang B, sistem membuat data `Rental` sekaligus tiket `Transfer`:
```javascript
// Membuat data Rental (Masih menunggu pembayaran)
db.rentals.insertOne({
  rentalCode: "RNT-A-12345",
  customerId: ObjectId("64abcd1234567890"), // ID Pelanggan
  vehicleId: ObjectId("64dcba0987654321"), // ID Kendaraan dari Cabang B
  pickupBranch: "A",
  returnBranch: "A",
  ownerBranch: "B",
  rentalBranch: "A",
  isCrossBranch: true,
  status: "Pending Payment",
  startDate: new Date("2026-07-15T08:00:00Z"),
  expectedRentFinishDate: new Date("2026-07-17T08:00:00Z"),
  totalDays: 2,
  totalPrice: 600000
});

// Membuat tiket Transfer pengiriman
db.transfers.insertOne({
  transferCode: "TRF-A-12345",
  vehicleId: ObjectId("64dcba0987654321"),
  fromBranch: "B",
  toBranch: "A",
  rentalBranch: "A",
  status: "Requested",
  requestDate: new Date()
});
```

### 2. Konfirmasi Pembayaran (Di Database Cabang A)
Pelanggan membayar, status `Rental` berubah menunggu pengiriman, dan tiket `Transfer` menyebarkan sinkronisasi ke Cabang B.
```javascript
// Update status Rental
db.rentals.updateOne(
  { rentalCode: "RNT-A-12345" },
  { $set: { status: "Waiting Transfer" } }
);

// Saat ini sistem API melakukan webhook ke Cabang B untuk sinkronisasi Request
```

### 3. Persetujuan Request (Di Database Cabang B)
Cabang B menyetujui peminjaman dan mulai mengirim mobil.
```javascript
// Cabang B meng-approve Request
db.transfers.updateOne(
  { transferCode: "TRF-A-12345" },
  { $set: { status: "Approved" } }
);

// Status mobil diubah menjadi "Transfer" (sedang di jalan)
db.vehicles.updateOne(
  { _id: ObjectId("64dcba0987654321") },
  { $set: { status: "Transfer" } }
);
```

### 4. Mobil Tiba (Di Database Cabang A)
Cabang A menerima mobil secara fisik, siap diserahkan ke pelanggan.
```javascript
// Konfirmasi terima unit
db.transfers.updateOne(
  { transferCode: "TRF-A-12345" },
  { $set: { status: "Arrived", arrivalDate: new Date() } }
);

// Status rental menjadi menunggu diserahkan ke customer
db.rentals.updateOne(
  { rentalCode: "RNT-A-12345" },
  { $set: { status: "Waiting Handover" } }
);

/* 
 * (Via API Sinkronisasi) Di DB Cabang B: 
 * db.vehicles.updateOne( { _id: ObjectId("...") }, { $set: { status: "Reserved" } } );
 */
```

### 5. Mulai Penyewaan (Di Database Cabang A)
Kunci diserahkan ke pelanggan, durasi argo sewa mulai dihitung.
```javascript
// Ubah status transfer
db.transfers.updateOne(
  { transferCode: "TRF-A-12345" },
  { $set: { status: "Started" } }
);

// Aktifkan rental
db.rentals.updateOne(
  { rentalCode: "RNT-A-12345" },
  { $set: { status: "Active" } }
);

// Tandai pelanggan sedang menyewa
db.customers.updateOne(
  { _id: ObjectId("64abcd1234567890") },
  { $set: { isRenting: true } }
);

/* 
 * (Via API Sinkronisasi) Di DB Cabang B: 
 * db.vehicles.updateOne( { _id: ObjectId("...") }, { $set: { status: "Rented by Request" } } );
 */
```

### 6. Selesaikan Penyewaan (Di Database Cabang A)
Pelanggan mengembalikan mobil dengan selamat ke Cabang A. Penyewaan selesai.
```javascript
// Ubah status transfer menjadi Rent Finished
db.transfers.updateOne(
  { transferCode: "TRF-A-12345" },
  { $set: { status: "Rent Finished" } }
);

// Selesaikan dokumen penyewaan
db.rentals.updateOne(
  { rentalCode: "RNT-A-12345" },
  { $set: { status: "Completed", actualReturnDate: new Date() } }
);

// Lepaskan status peminjaman pelanggan
db.customers.updateOne(
  { _id: ObjectId("64abcd1234567890") },
  { $set: { isRenting: false } }
);
```

### 7. Kembalikan Mobil ke Cabang Asal (Di Database Cabang A)
Supir Cabang A mengemudikan mobil kembali ke Cabang B.
```javascript
// Kirim mobil kembali
db.transfers.updateOne(
  { transferCode: "TRF-A-12345" },
  { $set: { status: "Waiting Return" } }
);
```

### 8. Mobil Sampai di Pemilik (Di Database Cabang B)
Cabang B mengonfirmasi mobil telah tiba dengan aman. Seluruh siklus logistik selesai.
```javascript
// Konfirmasi pengembalian (Tiket Selesai)
db.transfers.updateOne(
  { transferCode: "TRF-A-12345" },
  { $set: { status: "Completed" } }
);

// Mobil kembali bebas disewa di kandang asalnya
db.vehicles.updateOne(
  { _id: ObjectId("64dcba0987654321") },
  { $set: { status: "Available" } }
);
```
