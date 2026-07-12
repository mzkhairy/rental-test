# Entity-Relationship Diagram (ERD) RentSync

Dokumen ini berisi rancangan relasi database MongoDB untuk sistem penyewaan kendaraan RentSync. Anda dapat membuat gambar diagram visualnya dengan menyalin kode PlantUML di bawah ini ke situs **[PlantText](https://www.planttext.com/)** atau **[PlantUML Web Server](https://www.plantuml.com/plantuml/uml/)**.

## 1. Kode PlantUML (Salin Kode Ini)

```plantuml
@startuml
hide circle
hide methods
hide stereotypes

skinparam class {
    BackgroundColor white
    BorderColor #222222
    ArrowColor #222222
}

!define primary_key(x) <b><color:#b8861b><&key></color> x</b>
!define foreign_key(x) <color:#aaaaaa><&key></color> x

entity "Branch" as branch {
  primary_key(_id) : ObjectId
  --
  branchCode : String [Unique]
  branchName : String
  city : String
  address : String
  host : String
  apiPort : Number
  databaseName : String
  status : String
}

entity "Customer" as customer {
  primary_key(_id) : ObjectId
  --
  customerCode : String [Unique]
  foreign_key(branchCode) : String (Ref: Branch)
  fullName : String
  identityNumber : String [Unique]
  driverLicense : String
  phone : String
  email : String
  address : String
  isRenting : Boolean
}

entity "Employee" as employee {
  primary_key(_id) : ObjectId
  --
  employeeCode : String [Unique]
  foreign_key(branchCode) : String (Ref: Branch)
  fullName : String
  role : String
  phone : String
  email : String
  password : String
  salary : Number
  homeBranch : String
  currentBranch : String
  status : String
}

entity "Vehicle" as vehicle {
  primary_key(_id) : ObjectId
  --
  vehicleCode : String [Unique]
  foreign_key(homeBranch) : String (Ref: Branch)
  foreign_key(currentBranch) : String (Ref: Branch)
  plateNumber : String [Unique]
  brand : String
  model : String
  year : Number
  category : String
  transmission : String
  seatCapacity : Number
  dailyRate : Number
  status : String
  odometer : Number
  lastService : Date
}

entity "Rental" as rental {
  primary_key(_id) : ObjectId
  --
  rentalCode : String [Unique]
  foreign_key(customerId) : ObjectId (Ref: Customer)
  foreign_key(vehicleId) : ObjectId (Ref: Vehicle)
  foreign_key(handledBy) : ObjectId (Ref: Employee)
  foreign_key(transferId) : ObjectId (Ref: Transfer)
  foreign_key(pickupBranch) : String
  foreign_key(returnBranch) : String
  foreign_key(ownerBranch) : String
  foreign_key(rentalBranch) : String
  startDate : Date
  expectedRentFinishDate : Date
  actualReturnDate : Date
  totalDays : Number
  totalPrice : Number
  isCrossBranch : Boolean
  status : String
}

entity "Transfer" as transfer {
  primary_key(_id) : ObjectId
  --
  transferCode : String [Unique]
  foreign_key(vehicleId) : ObjectId (Ref: Vehicle)
  foreign_key(requestedBy) : ObjectId (Ref: Employee)
  foreign_key(approvedBy) : ObjectId (Ref: Employee)
  foreign_key(rentalBranch) : String
  foreign_key(fromBranch) : String
  foreign_key(toBranch) : String
  vehicleName : String
  vehiclePlate : String
  startDate : Date
  totalDays : Number
  expectedRentFinishDate : Date
  requestDate : Date
  departureDate : Date
  arrivalDate : Date
  status : String
  notes : String
}

entity "Notification" as notification {
  primary_key(_id) : ObjectId
  --
  foreign_key(branchCode) : String (Ref: Branch)
  title : String
  message : String
  link : String
  isRead : Boolean
}

' Relasi Cabang (Branch)
branch ||--o{ customer : "Registers >"
branch ||--o{ employee : "Employs >"
branch ||--o{ vehicle : "Owns >"
branch ||--o{ notification : "Receives >"

' Relasi Aktor terhadap Transaksi & Logistik
customer ||--o{ rental : "Makes >"
employee ||--o{ rental : "Handles >"
employee ||--o{ transfer : "Requests / Approves >"

' Relasi Aset terhadap Transaksi & Logistik
vehicle ||--o{ rental : "Rented in >"
vehicle ||--o{ transfer : "Delivered in >"

' Relasi Inti Logistik
transfer |o--o| rental : "Linked to (Cross-Branch) >"

@enduml
```

---

## 2. Penjelasan Relasi Antar-Koleksi (Collection)

Dalam lingkungan MongoDB (NoSQL) yang digunakan RentSync, relasi dibentuk dengan merujuk pada `ObjectId` ataupun `branchCode` antar dokumen. 

Berikut adalah rincian kardinalitas relasi antar-*collection*-nya:

### A. Branch (Cabang)
`Branch` adalah titik sentral dari arsitektur P2P RentSync. Cabang memiliki relasi **Satu-ke-Banyak (1:N)** dengan koleksi lainnya:
- **1 Branch punya N Customers**: Setiap *customer* akan diregistrasikan dan dicatat pertama kali di satu `branchCode` tertentu.
- **1 Branch punya N Employees**: Setiap karyawan ditempatkan di sebuah `branchCode`.
- **1 Branch punya N Vehicles**: Setiap mobil terikat secara *de jure* pada kepemilikan sebuah `homeBranch`.
- **1 Branch punya N Notifications**: Setiap lonceng/pesan notifikasi dari sistem akan dialamatkan secara spesifik ke kode cabang tertentu.

### B. Customer (Pelanggan)
- **1 Customer memiliki N Rentals (1:N)**: Seorang pelanggan dapat menyewa kendaraan berkali-kali. `Rental` akan mereferensikan `ObjectId` milik si pelanggan dalam kolom `customerId`.

### C. Employee (Pegawai / Admin)
- **1 Employee menangani N Rentals (1:N)**: Setiap tagihan/transaksi rental akan mencatat siapa *Admin* yang memproses (*checkout*) dokumen tersebut dalam kolom `handledBy`.
- **1 Employee mengajukan/menyetujui N Transfers (1:N)**: Tiket logistik *cross-branch* (`Transfer`) akan mencatat siapa Admin yang memintanya (`requestedBy`) dan siapa Admin dari cabang pemilik yang merestuinya (`approvedBy`).

### D. Vehicle (Kendaraan)
- **1 Vehicle terlibat dalam N Rentals (1:N)**: Sebuah kendaraan dipakai untuk banyak penyewaan historis. Relasi ini tertaut pada kolom `vehicleId` dalam `Rental`.
- **1 Vehicle terlibat dalam N Transfers (1:N)**: Sebuah kendaraan bisa dimutasi atau dikirim ke berbagai cabang dari waktu ke waktu. Relasi ini tertaut pada kolom `vehicleId` dalam `Transfer`.

### E. Rental & Transfer (Relasi 1:1 Bersyarat)
- **1 Rental terikat maksimal pada 1 Transfer (1:0..1)**:
  - Jika penyewaan bersifat **lokal** (cabang menyewakan mobilnya sendiri), maka `Rental` tidak akan memiliki *Transfer* (`transferId` kosong).
  - Namun, jika penyewaan bersifat **lintas cabang** (`isCrossBranch = true`), maka 1 dokumen `Rental` *WAJIB* dihubungkan langsung dengan 1 dokumen `Transfer` melalui tautan silang `transferId`. 
  - Relasi ini bersifat transaksional: perubahan status pada `Transfer` (seperti saat mobil *Arrived* atau *Rent Finished*) akan secara proaktif memengaruhi status tagihan di `Rental` yang terkait.
