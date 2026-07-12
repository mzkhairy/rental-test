# Dokumentasi API RentSync

Dokumen ini merangkum seluruh *endpoints* REST API yang tersedia pada *backend* RentSync. Sebagian besar API dilindungi dengan middleware otentikasi (`requireAuth`) menggunakan JSON Web Token (JWT).

## 1. Authentication (`/api/auth`)
| Method | Endpoint | Keterangan | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/login` | Login admin/karyawan dan mendapatkan JWT token. | No |
| `POST` | `/api/auth/logout` | Logout (Menghapus *cookie* JWT). | No |
| `GET` | `/api/auth/me` | Mengambil data user yang sedang login saat ini. | Yes |

## 2. Branches (`/api/branches`)
| Method | Endpoint | Keterangan | Auth Required |
|---|---|---|---|
| `GET` | `/api/branches` | Mengambil daftar seluruh cabang di sistem P2P. | No |

## 3. Customers (`/api/customers`)
| Method | Endpoint | Keterangan | Auth Required |
|---|---|---|---|
| `GET` | `/api/customers` | Mendapatkan semua daftar pelanggan di cabang ini. | Yes |
| `POST` | `/api/customers` | Menambahkan pelanggan baru. | Yes |
| `PUT` | `/api/customers/:id` | Mengedit data pelanggan yang sudah ada. | Yes |
| `DELETE` | `/api/customers/:id` | Menghapus pelanggan. | Yes |

## 4. Employees (`/api/employees`)
| Method | Endpoint | Keterangan | Auth Required |
|---|---|---|---|
| `GET` | `/api/employees` | Mendapatkan daftar pegawai cabang. | Yes |
| `POST` | `/api/employees` | Mendaftarkan pegawai (Admin/Driver) baru. | Yes |
| `PUT` | `/api/employees/:id` | Mengedit data pegawai. | Yes |
| `DELETE` | `/api/employees/:id` | Menghapus pegawai dari sistem. | Yes |

## 5. Vehicles (`/api/vehicles`)
| Method | Endpoint | Keterangan | Auth Required |
|---|---|---|---|
| `GET` | `/api/vehicles` | Mengambil daftar semua kendaraan yang terdaftar. | Yes |
| `GET` | `/api/vehicles/available` | Mengambil daftar kendaraan berstatus `Available` pada *range* tanggal tertentu (Bisa dipanggil oleh cabang lain). | No |
| `GET` | `/api/vehicles/:id` | Mengambil detail spesifik satu mobil. | No |
| `POST` | `/api/vehicles` | Menambahkan aset mobil baru ke database cabang. | Yes |
| `PUT` | `/api/vehicles/:id` | Mengubah informasi mobil (Odometer, servis, dll). | Yes |
| `DELETE` | `/api/vehicles/:id` | Menghapus/menjual aset mobil. | Yes |

## 6. Rentals / Transaksi Lokal (`/api/rentals`)
| Method | Endpoint | Keterangan | Auth Required |
|---|---|---|---|
| `GET` | `/api/rentals` | Melihat seluruh *invoice* penyewaan lokal yang pernah dibuat. | Yes |
| `POST` | `/api/rentals` | Membuat *invoice* transaksi sewa baru (Status: `Pending Payment`). | Yes |
| `PUT` | `/api/rentals/:id` | Mengedit data transaksi yang masih `Pending Payment`. | Yes |
| `PUT` | `/api/rentals/:id/confirm-payment` | Mengonfirmasi pembayaran. (Memulai status `Active` lokal, atau `Waiting Transfer` lintas cabang). | Yes |
| `PUT` | `/api/rentals/:id/cancel` | Membatalkan transaksi penyewaan. | Yes |
| `PUT` | `/api/rentals/:id/return` | Selesaikan penyewaan lokal & mengembalikan mobil (`Completed`). | Yes |
| `POST` | `/api/rentals/:id/arrive` | *(Deprecated)* Awalnya digunakan untuk konfirmasi mobil tiba. Kini di-_handle_ via `/transfers`. | Yes |
| `POST` | `/api/rentals/:id/start` | *(Deprecated)* Awalnya digunakan untuk start mobil. Kini di-_handle_ via `/transfers`. | Yes |

## 7. Transfers / Logistik Lintas Cabang (`/api/transfers`)
| Method | Endpoint | Keterangan | Auth Required |
|---|---|---|---|
| `GET` | `/api/transfers` | Melihat log *request* keluar dari cabang saat ini. | Yes |
| `GET` | `/api/transfers/incoming` | Melihat daftar *request* yang masuk (untuk disetujui/ditolak). | No |
| `POST` | `/api/transfers/request` | Membuat tiket *request* pinjaman kendaraan lintas-cabang. | Yes |
| `POST` | `/api/transfers/incoming-request` | Webhook *receiver* internal ketika dipanggil API `/request` dari cabang peminjam. | No |
| `POST` | `/api/transfers/sync-status` | Webhook utama untuk sinkronisasi mutasi status (*Requested*, *Arrived*, dll) antar server cabang. | No |
| `POST` | `/api/transfers/:id/approve` | Menyetujui *request* masuk (Oleh cabang pemilik). | Yes |
| `POST` | `/api/transfers/:id/reject` | Menolak *request* masuk (Oleh cabang pemilik). | Yes |
| `POST` | `/api/transfers/:id/arrive` | Konfirmasi terima mobil kiriman (`Arrived`). | Yes |
| `POST` | `/api/transfers/:id/start` | Konfirmasi kunci diserahkan ke pelanggan (`Started`). | Yes |
| `POST` | `/api/transfers/:id/finish-rent` | Konfirmasi pelanggan memulangkan mobil ke cabang tujuan (`Rent Finished`). | Yes |
| `POST` | `/api/transfers/:id/return` | Aksi cabang tujuan memulangkan mobil kembali ke cabang asal (`Waiting Return`). | Yes |
| `POST` | `/api/transfers/:id/complete` | Konfirmasi mobil telah pulang dengan selamat ke cabang asal (`Completed`). | Yes |

## 8. Notifications (`/api/notifications`)
| Method | Endpoint | Keterangan | Auth Required |
|---|---|---|---|
| `GET` | `/api/notifications` | Mengambil semua bel / pop-up notifikasi milik admin. | Yes |
| `PUT` | `/api/notifications/:id/read` | Menandai satu notifikasi telah dibaca. | Yes |
| `PUT` | `/api/notifications/read-all` | Menandai seluruh notifikasi yang ada sebagai terbaca. | Yes |
