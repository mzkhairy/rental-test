const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const requireAuth = require('../middleware/requireAuth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const customer = new Customer({
      ...req.body,
      branchCode: process.env.BRANCH_CODE
    });
    await customer.save();
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const c = await Customer.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Customer not found' });
    if (c.isRenting) {
      return res.status(400).json({ message: 'Data pelanggan tidak dapat diedit saat sedang meminjam kendaraan.' });
    }
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(customer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const c = await Customer.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Customer not found' });
    if (c.isRenting) {
      return res.status(400).json({ message: 'Pelanggan tidak dapat dihapus saat sedang meminjam kendaraan.' });
    }
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
