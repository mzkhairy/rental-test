require('dotenv').config({ path: __dirname + '/../.env.jkt' });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Branch = require('../models/Branch');
const Employee = require('../models/Employee');
const Vehicle = require('../models/Vehicle');
const Customer = require('../models/Customer');
const Rental = require('../models/Rental');
const Transfer = require('../models/Transfer');

const branchesData = [
  { branchCode: 'JKT', branchName: 'Jakarta', city: 'Jakarta', address: 'Jl. Sudirman', host: '127.0.0.1', apiPort: 4001, dbName: 'rentsync_jkt' },
  { branchCode: 'BGR', branchName: 'Bogor', city: 'Bogor', address: 'Jl. Pajajaran', host: '127.0.0.1', apiPort: 4002, dbName: 'rentsync_bgr' },
  { branchCode: 'DPK', branchName: 'Depok', city: 'Depok', address: 'Jl. Margonda', host: '127.0.0.1', apiPort: 4003, dbName: 'rentsync_dpk' },
  { branchCode: 'TGR', branchName: 'Tangerang', city: 'Tangerang', address: 'Jl. Daan Mogot', host: '127.0.0.1', apiPort: 4004, dbName: 'rentsync_tgr' },
  { branchCode: 'BKS', branchName: 'Bekasi', city: 'Bekasi', address: 'Jl. Ahmad Yani', host: '127.0.0.1', apiPort: 4005, dbName: 'rentsync_bks' }
];

const seedData = async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('Rentsync123!', salt);
    const baseUri = 'mongodb://127.0.0.1:27021,127.0.0.1:27022,127.0.0.1:27023,127.0.0.1:27024,127.0.0.1:27025';
    let empSeq = 1;
    let vehSeq = 1;

    for (const b of branchesData) {
      console.log(`\nMenghubungkan ke database ${b.dbName}...`);
      const uri = `${baseUri}/${b.dbName}?replicaSet=rsRental`;
      
      await mongoose.disconnect();
      await mongoose.connect(uri);
      
      // Clear data per database cabang
      await Branch.deleteMany();
      await Employee.deleteMany();
      await Vehicle.deleteMany();
      await Customer.deleteMany();
      await Rental.deleteMany();
      await Transfer.deleteMany();
      
      console.log(`Data lama di ${b.dbName} berhasil dibersihkan.`);

      // 1. Seed Branches (Routing table)
      await Branch.insertMany(branchesData);
      
      // 2. Seed Employees for this branch (Tanpa Manager)
      const employees = [];
      // 2 Admin
      for (let i = 1; i <= 2; i++) {
        employees.push({
          employeeCode: `${b.branchCode}-ADM-${empSeq++}`,
          fullName: `Admin ${i} ${b.branchName}`,
          branchCode: b.branchCode,
          role: 'Admin',
          phone: '08111222444',
          email: `admin${i}@${b.branchCode.toLowerCase()}.com`,
          password: adminPassword,
          salary: 6500000
        });
      }
      // 4 Driver
      for (let i = 1; i <= 4; i++) {
        employees.push({
          employeeCode: `${b.branchCode}-DRV-${empSeq++}`,
          fullName: `Driver ${i} ${b.branchName}`,
          branchCode: b.branchCode,
          role: 'Driver',
          phone: '08111222555',
          email: `driver${i}@${b.branchCode.toLowerCase()}.com`,
          salary: 5000000,
          homeBranch: b.branchCode,
          currentBranch: b.branchCode
        });
      }
      await Employee.insertMany(employees);

      // 3. Seed Vehicles for this branch
      const vehicles = [];
      if (b.branchCode === 'JKT') {
        vehicles.push({
          vehicleCode: `V-JKT-${vehSeq++}`,
          plateNumber: `B 1111 JKT`,
          brand: 'Toyota',
          model: 'Fortuner',
          year: 2023,
          category: 'SUV',
          transmission: 'Automatic',
          seatCapacity: 7,
          dailyRate: 850000,
          homeBranch: 'JKT',
          currentBranch: 'JKT',
          status: 'Available'
        });
      }

      for (let i = 1; i <= 3; i++) {
        vehicles.push({
          vehicleCode: `V-${b.branchCode}-${vehSeq++}`,
          plateNumber: `B ${Math.floor(1000 + Math.random() * 9000)} ${b.branchCode}`,
          brand: 'Toyota',
          model: 'Avanza',
          year: 2022,
          category: 'MPV',
          transmission: 'Automatic',
          seatCapacity: 7,
          dailyRate: 400000,
          homeBranch: b.branchCode,
          currentBranch: b.branchCode,
          status: 'Available'
        });
      }
      await Vehicle.insertMany(vehicles);

      // 4. Seed Customers
      const customers = [
        {
          customerCode: 'CUST-001',
          fullName: 'Budi Santoso',
          identityNumber: '3201011111111111',
          driverLicense: '990111111111',
          phone: '081333444555',
          email: 'budi@example.com',
          address: 'Jl. Merdeka No 1, Jakarta',
          branchCode: b.branchCode
        }
      ];
      await Customer.insertMany(customers);

      console.log(`Berhasil seeding data untuk cabang ${b.branchCode}`);
    }

    console.log('\n=================================');
    console.log('Semua database cabang selesai di-seed!');
    console.log('=================================');
    process.exit();

  } catch (error) {
    console.error(`Gagal melakukan seeding: ${error.message}`);
    process.exit(1);
  }
};

seedData();
