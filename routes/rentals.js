const express = require('express');
const router = express.Router();
const Rental = require('../models/Rental');
const Vehicle = require('../models/Vehicle');
const Customer = require('../models/Customer');
const requireAuth = require('../middleware/requireAuth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const rentals = await Rental.find({ pickupBranch: process.env.BRANCH_CODE })
      .populate('customerId vehicleId handledBy');
    res.json(rentals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.body.vehicleId);
    if (!vehicle || vehicle.status !== 'Available') {
      return res.status(400).json({ message: 'Kendaraan tidak tersedia' });
    }

    const rental = new Rental({
      ...req.body,
      handledBy: req.session.userId,
      pickupBranch: process.env.BRANCH_CODE,
      returnBranch: process.env.BRANCH_CODE,
      status: 'Pending Payment'
    });

    await rental.save();

    vehicle.status = 'Rented'; // Reserved/Rented
    await vehicle.save();

    res.status(201).json(rental);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/confirm-payment', requireAuth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental || rental.status !== 'Pending Payment') return res.status(400).json({ message: 'Status tidak valid' });
    rental.status = 'Active';
    await rental.save();
    await Customer.findByIdAndUpdate(rental.customerId, { isRenting: true });
    res.json(rental);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental || rental.status !== 'Pending Payment') return res.status(400).json({ message: 'Hanya bisa membatalkan transaksi pending' });
    rental.status = 'Cancelled';
    await rental.save();
    const vehicle = await Vehicle.findById(rental.vehicleId);
    if (vehicle) {
      vehicle.status = 'Available';
      await vehicle.save();
    }
    res.json(rental);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/return', requireAuth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental || rental.status !== 'Active') {
      return res.status(400).json({ message: 'Rental tidak aktif' });
    }

    rental.status = 'Completed';
    rental.actualReturnDate = new Date();
    rental.returnBranch = process.env.BRANCH_CODE; // Disimpan di cabang mana dia dikembalikan
    await rental.save();

    const vehicle = await Vehicle.findById(rental.vehicleId);
    if (vehicle) {
      vehicle.status = 'Available';
      vehicle.currentBranch = process.env.BRANCH_CODE;
      await vehicle.save();
    }

    const activeRentals = await Rental.countDocuments({ customerId: rental.customerId, status: 'Active' });
    if (activeRentals === 0) {
      await Customer.findByIdAndUpdate(rental.customerId, { isRenting: false });
    }

    res.json(rental);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
