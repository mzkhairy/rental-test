require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Branch = require('../models/Branch');
const Employee = require('../models/Employee');
const Vehicle = require('../models/Vehicle');
const Customer = require('../models/Customer');
const Rental = require('../models/Rental');
const Transfer = require('../models/Transfer');

const networkMode = process.env.NETWORK_MODE || 'local';

const ipConfigs = {
  zerotier: {
    BKS: '10.11.98.176',
    BGR: '10.11.98.80',
    DPK: '10.11.98.62',
    JKT: '10.11.98.70',
    TGR: '10.11.98.149'
  },
  switch: {
    BKS: '192.168.1.3',
    BGR: '192.168.1.6',
    DPK: '192.168.1.5',
    JKT: '192.168.1.2',
    TGR: '192.168.1.4'
  },
  local: {
    BKS: '127.0.0.1',
    BGR: '127.0.0.1',
    DPK: '127.0.0.1',
    JKT: '127.0.0.1',
    TGR: '127.0.0.1'
  }
};

const networkIPs = ipConfigs[networkMode] || ipConfigs.local;

const branchesData = [
  { branchCode: 'JKT', branchName: 'Jakarta', city: 'Jakarta', address: 'Jl. Sudirman', host: networkIPs.JKT, apiPort: networkMode === 'local' ? 4001 : 4000, dbName: 'rentsync_jkt' },
  { branchCode: 'BGR', branchName: 'Bogor', city: 'Bogor', address: 'Jl. Pajajaran', host: networkIPs.BGR, apiPort: networkMode === 'local' ? 4002 : 4000, dbName: 'rentsync_bgr' },
  { branchCode: 'DPK', branchName: 'Depok', city: 'Depok', address: 'Jl. Margonda', host: networkIPs.DPK, apiPort: networkMode === 'local' ? 4003 : 4000, dbName: 'rentsync_dpk' },
  { branchCode: 'TGR', branchName: 'Tangerang', city: 'Tangerang', address: 'Jl. Daan Mogot', host: networkIPs.TGR, apiPort: networkMode === 'local' ? 4004 : 4000, dbName: 'rentsync_tgr' },
  { branchCode: 'BKS', branchName: 'Bekasi', city: 'Bekasi', address: 'Jl. Ahmad Yani', host: networkIPs.BKS, apiPort: networkMode === 'local' ? 4005 : 4000, dbName: 'rentsync_bks' }
];

const categories = ['MPV', 'SUV', 'Sedan', 'Hatchback'];
const carModels = {
  MPV: [ { brand: 'Toyota', model: 'Avanza', rate: 400000 }, { brand: 'Daihatsu', model: 'Xenia', rate: 350000 }, { brand: 'Mitsubishi', model: 'Xpander', rate: 450000 }, { brand: 'Suzuki', model: 'Ertiga', rate: 400000 }, { brand: 'Wuling', model: 'Confero', rate: 300000 } ],
  SUV: [ { brand: 'Toyota', model: 'Fortuner', rate: 850000 }, { brand: 'Mitsubishi', model: 'Pajero', rate: 900000 }, { brand: 'Honda', model: 'CR-V', rate: 800000 }, { brand: 'Hyundai', model: 'Creta', rate: 600000 }, { brand: 'Kia', model: 'Seltos', rate: 650000 } ],
  Sedan: [ { brand: 'Honda', model: 'Civic', rate: 750000 }, { brand: 'Toyota', model: 'Camry', rate: 850000 }, { brand: 'Mazda', model: '3 Sedan', rate: 700000 }, { brand: 'Mercedes', model: 'C-Class', rate: 1200000 }, { brand: 'BMW', model: '320i', rate: 1100000 } ],
  Hatchback: [ { brand: 'Honda', model: 'Brio', rate: 300000 }, { brand: 'Toyota', model: 'Yaris', rate: 400000 }, { brand: 'Suzuki', model: 'Baleno', rate: 350000 }, { brand: 'Mazda', model: '2 Hatchback', rate: 450000 }, { brand: 'Hyundai', model: 'Ioniq 5', rate: 900000 } ]
};

const seedData = async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('Rentsync123!', salt);
    const baseUri = process.env.MONGO_URI ? process.env.MONGO_URI.split('/')[0] + '/' + process.env.MONGO_URI.split('/')[1] + '/' + process.env.MONGO_URI.split('/')[2] : 'mongodb://127.0.0.1:27021,127.0.0.1:27022,127.0.0.1:27023,127.0.0.1:27024,127.0.0.1:27025';
    let empSeq = 1;
    let vehSeq = 1;

    for (const b of branchesData) {
      console.log(`\nMenghubungkan ke database ${b.dbName}...`);
      const uri = process.env.MONGO_URI ? process.env.MONGO_URI.replace(/rentsync_[a-z]+/, b.dbName) : `${baseUri}/${b.dbName}?replicaSet=rsRental`;
      
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
          phone: `0811122244${i}`,
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
          phone: `0811122255${i}`,
          email: `driver${i}@${b.branchCode.toLowerCase()}.com`,
          salary: 5000000,
          homeBranch: b.branchCode,
          currentBranch: b.branchCode
        });
      }
      await Employee.insertMany(employees);

      // 3. Seed Vehicles for this branch
      const vehicles = [];
      let catIdxOffset = branchesData.findIndex(x => x.branchCode === b.branchCode);
      
      for (const cat of categories) {
        // 2 vehicles per category
        for (let i = 1; i <= 2; i++) {
          const modelList = carModels[cat];
          const modelObj = modelList[(catIdxOffset * 2 + i) % modelList.length];
          vehicles.push({
            vehicleCode: `V-${b.branchCode}-${vehSeq++}`,
            plateNumber: `B ${Math.floor(1000 + Math.random() * 9000)} ${b.branchCode}`,
            brand: modelObj.brand,
            model: modelObj.model,
            year: 2020 + (catIdxOffset % 3) + (i % 2),
            category: cat,
            transmission: i === 1 ? 'Automatic' : 'Manual',
            seatCapacity: cat === 'MPV' || cat === 'SUV' ? 7 : 5,
            dailyRate: modelObj.rate,
            homeBranch: b.branchCode,
            currentBranch: b.branchCode,
            status: 'Available'
          });
        }
      }
      await Vehicle.insertMany(vehicles);

      // 4. Seed Customers
      const customers = [];
      for (let i = 1; i <= 5; i++) {
        customers.push({
          customerCode: `CUST-${b.branchCode}-${i}`,
          fullName: `Customer ${i} ${b.branchName}`,
          identityNumber: `3201${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          driverLicense: `990${Math.floor(100000000 + Math.random() * 900000000)}`,
          phone: `081${Math.floor(100000000 + Math.random() * 900000000)}`,
          email: `cust${i}@${b.branchCode.toLowerCase()}.com`,
          address: `Jl. Pelanggan No ${i}, ${b.city}`,
          branchCode: b.branchCode
        });
      }
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
