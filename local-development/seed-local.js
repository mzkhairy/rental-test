// Script Seeding Khusus Local Development
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
    const baseUri = 'mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019,127.0.0.1:27020,127.0.0.1:27021';
    let empSeq = 1;
    let vehSeq = 1;

    for (const b of branchesData) {
      console.log(`\nMenghubungkan ke database lokal ${b.dbName}...`);
      const uri = `${baseUri}/${b.dbName}?replicaSet=rsRental`;
      
      await mongoose.disconnect();
      await mongoose.connect(uri);
      
      await Branch.deleteMany();
      await Employee.deleteMany();
      await Vehicle.deleteMany();
      await Customer.deleteMany();
      await Rental.deleteMany();
      await Transfer.deleteMany();
      
      console.log(`Data lama di ${b.dbName} berhasil dibersihkan.`);

      await Branch.insertMany(branchesData);
      
      const employees = [];
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

      const vehicles = [];
      let catIdxOffset = branchesData.findIndex(x => x.branchCode === b.branchCode);
      
      for (const cat of categories) {
        for (let i = 1; i <= 2; i++) {
          const modelList = carModels[cat];
          const modelObj = modelList[(catIdxOffset * 2 + i) % modelList.length];
          vehicles.push({
            vehicleCode: `V-${b.branchCode}-${vehSeq}`,
            plateNumber: `B ${1000 + vehSeq} ${b.branchCode}`,
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
          vehSeq++;
        }
      }
      await Vehicle.insertMany(vehicles);

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
    console.log('Semua database cabang selesai di-seed untuk Local Development!');
    console.log('=================================');
    process.exit();

  } catch (error) {
    console.error(`Gagal melakukan seeding: ${error.message}`);
    process.exit(1);
  }
};

seedData();
