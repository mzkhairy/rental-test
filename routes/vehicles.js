const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const requireAuth = require('../middleware/requireAuth');

// GET /api/vehicles
router.get('/', requireAuth, async (req, res) => {
  try {
    // Ambil mobil yang sedang berada di cabang ini
    const vehicles = await Vehicle.find({ currentBranch: process.env.BRANCH_CODE });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/vehicles/available (Endpoint P2P Antar Cabang)
// Tidak menggunakan requireAuth agar cabang lain bisa langsung memanggilnya
router.get('/available', async (req, res) => {
  try {
    const { brand, model } = req.query;
    let query = { 
      currentBranch: process.env.BRANCH_CODE,
      status: 'Available' 
    };

    if (brand) query.brand = new RegExp(brand, 'i');
    if (model) query.model = new RegExp(model, 'i');

    const vehicles = await Vehicle.find(query);
    res.json({ branchCode: process.env.BRANCH_CODE, vehicles });
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
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(vehicle);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
