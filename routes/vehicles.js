const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const requireAuth = require('../middleware/requireAuth');
const Rental = require('../models/Rental');
const Transfer = require('../models/Transfer');

async function getAvailableVehicles(query, startDate, endDate) {
  let vehicles = await Vehicle.find(query);

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    vehicles = vehicles.filter(v => v.status !== 'Maintenance');

    const overlappingRentals = await Rental.find({
      status: { $in: ['Pending', 'Waiting Transfer', 'Pending Payment', 'Active'] },
      $or: [
        { startDate: { $lte: end }, expectedRentFinishDate: { $gte: start } }
      ]
    }).select('vehicleId');
    const bookedLocalIds = overlappingRentals.map(r => r.vehicleId.toString());

    const overlappingTransfers = await Transfer.find({
      fromBranch: process.env.BRANCH_CODE,
      status: { $in: ['Requested', 'Approved', 'In Transit', 'Arrived', 'Waiting Return'] },
      $or: [
        { startDate: { $lte: end }, expectedRentFinishDate: { $gte: start } }
      ]
    }).select('vehicleId');
    const bookedTransferIds = overlappingTransfers.map(t => t.vehicleId.toString());

    const allBookedIds = new Set([...bookedLocalIds, ...bookedTransferIds]);

    vehicles = vehicles.filter(v => !allBookedIds.has(v._id.toString()));
  }

  return vehicles;
}

// GET /api/vehicles
router.get('/', requireAuth, async (req, res) => {
  try {
    // Ambil mobil yang sedang berada di cabang ini
    let query = { currentBranch: process.env.BRANCH_CODE };
    if (req.query.status && !req.query.startDate) {
      query.status = req.query.status;
    }
    const vehicles = await getAvailableVehicles(query, req.query.startDate, req.query.endDate);
    
    const enhancedVehicles = await Promise.all(vehicles.map(async (v) => {
      const vObj = v.toObject ? v.toObject() : v;
      if (['Booked', 'Rented', 'Rented by request', 'Transfer'].includes(vObj.status)) {
        const activeRental = await Rental.findOne({ 
          vehicleId: vObj._id, 
          status: { $in: ['Pending', 'Waiting Transfer', 'Pending Payment', 'Active'] }
        }).sort({ expectedRentFinishDate: -1 });

        if (activeRental) {
          vObj.expectedRentFinishDate = activeRental.expectedRentFinishDate;
        } else {
          const activeTransfer = await Transfer.findOne({
             vehicleId: vObj._id,
             status: { $in: ['Requested', 'Approved', 'In Transit', 'Arrived', 'Waiting Return'] }
          }).sort({ expectedRentFinishDate: -1 });
          if (activeTransfer) {
             vObj.expectedRentFinishDate = activeTransfer.expectedRentFinishDate;
          }
        }
      }
      return vObj;
    }));
    
    res.json(enhancedVehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/vehicles/available (Endpoint P2P Antar Cabang)
// Tidak menggunakan requireAuth agar cabang lain bisa langsung memanggilnya
router.get('/available', async (req, res) => {
  try {
    const { brand, model, startDate, endDate } = req.query;
    let query = {
      currentBranch: process.env.BRANCH_CODE
    };
    if (!startDate) {
      query.status = 'Available';
    }

    if (brand) query.brand = new RegExp(brand, 'i');
    if (model) query.model = new RegExp(model, 'i');

    const vehicles = await getAvailableVehicles(query, startDate, endDate);
    
    const enhancedVehicles = await Promise.all(vehicles.map(async (v) => {
      const vObj = v.toObject ? v.toObject() : v;
      if (['Booked', 'Rented', 'Rented by request', 'Transfer'].includes(vObj.status)) {
        const activeRental = await Rental.findOne({ 
          vehicleId: vObj._id, 
          status: { $in: ['Pending', 'Waiting Transfer', 'Pending Payment', 'Active'] }
        }).sort({ expectedRentFinishDate: -1 });

        if (activeRental) {
          vObj.expectedRentFinishDate = activeRental.expectedRentFinishDate;
        } else {
          const activeTransfer = await Transfer.findOne({
             vehicleId: vObj._id,
             status: { $in: ['Requested', 'Approved', 'In Transit', 'Arrived', 'Waiting Return'] }
          }).sort({ expectedRentFinishDate: -1 });
          if (activeTransfer) {
             vObj.expectedRentFinishDate = activeTransfer.expectedRentFinishDate;
          }
        }
      }
      return vObj;
    }));
    
    res.json({ branchCode: process.env.BRANCH_CODE, vehicles: enhancedVehicles });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/vehicles/:id (Endpoint untuk sinkronisasi P2P)
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/vehicles
router.post('/', requireAuth, async (req, res) => {
  try {
    const vehicle = new Vehicle({
      ...req.body,
      homeBranch: process.env.BRANCH_CODE,
      currentBranch: process.env.BRANCH_CODE
    });
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/vehicles/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const v = await Vehicle.findById(req.params.id);
    if (!v) return res.status(404).json({ message: 'Vehicle not found' });
    if (v.status !== 'Available' && v.status !== 'Maintenance') {
      return res.status(400).json({ message: 'Kendaraan hanya dapat diedit saat statusnya Available atau Maintenance.' });
    }
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(vehicle);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const v = await Vehicle.findById(req.params.id);
    if (!v) return res.status(404).json({ message: 'Vehicle not found' });
    if (v.status !== 'Available' && v.status !== 'Maintenance') {
      return res.status(400).json({ message: 'Kendaraan hanya dapat dihapus saat statusnya Available atau Maintenance.' });
    }
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
