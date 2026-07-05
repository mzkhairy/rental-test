const express = require('express');
const router = express.Router();
const axios = require('axios');
const Transfer = require('../models/Transfer');
const Vehicle = require('../models/Vehicle');
const Branch = require('../models/Branch');
const Notification = require('../models/Notification');
const requireAuth = require('../middleware/requireAuth');

// Ambil riwayat transfer (sebagai asal atau tujuan)
router.get('/', requireAuth, async (req, res) => {
  try {
    const transfers = await Transfer.find({
      $or: [
        { fromBranch: process.env.BRANCH_CODE },
        { toBranch: process.env.BRANCH_CODE }
      ]
    }).populate('vehicleId');
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Request transfer dari cabang lain
router.post('/request', requireAuth, async (req, res) => {
  try {
    const { targetBranchCode, vehicleId, notes } = req.body;
    
    const targetBranch = await Branch.findOne({ branchCode: targetBranchCode });
    if (!targetBranch) return res.status(404).json({ message: 'Cabang tujuan tidak ditemukan' });

    // Komunikasi Peer-to-Peer
    const targetUrl = `http://${targetBranch.host}:${targetBranch.apiPort}/api/transfers/incoming-request`;
    
    const response = await axios.post(targetUrl, {
      fromBranch: process.env.BRANCH_CODE,
      vehicleId,
      requestedBy: req.session.userId,
      notes
    });

    // Fetch data kendaraan asli dari cabang tujuan untuk di-upsert ke lokal (P2P Sync)
    try {
      const vRes = await axios.get(`http://${targetBranch.host}:${targetBranch.apiPort}/api/vehicles/${vehicleId}`);
      if (vRes.data) {
        const vData = { ...vRes.data };
        delete vData._id;
        await Vehicle.findByIdAndUpdate(vehicleId, vData, { upsert: true, new: true, setDefaultsOnInsert: true });
      }
    } catch (e) {
      console.error('Gagal sync data kendaraan P2P:', e.message);
    }

    // Simpan salinan lokal
    const localTransfer = new Transfer({
      transferCode: response.data.transferCode,
      fromBranch: targetBranchCode, // Target adalah pemilik
      toBranch: process.env.BRANCH_CODE, // Kita adalah peminta
      vehicleId,
      requestedBy: req.session.userId,
      notes,
      status: 'Requested'
    });
    await localTransfer.save();

    res.status(201).json(localTransfer);
  } catch (err) {
    res.status(500).json({ message: 'Gagal berkomunikasi dengan cabang lain', error: err.message });
  }
});

// Endpoint untuk menerima update sinkronisasi dari cabang lain
router.post('/sync-status', async (req, res) => {
  try {
    const { transferCode, status, vehicleName, branchName } = req.body;
    await Transfer.findOneAndUpdate({ transferCode }, { status });
    
    // Create Notification
    let title = '';
    let message = '';
    let link = '';
    
    if (status === 'Approved') {
      title = 'Request Disetujui';
      message = `Cabang ${branchName || 'lain'} menyetujui request kendaraan Anda.`;
      link = '/transfers.html?highlight=ongoing';
    } else if (status === 'Rejected') {
      title = 'Request Ditolak';
      message = `Cabang ${branchName || 'lain'} menolak request kendaraan Anda.`;
      link = '/transfers.html?highlight=history';
    } else if (status === 'Arrived') {
      title = 'Mobil Tiba';
      message = `Mobil ${vehicleName || 'yang dikirim'} telah tiba di Cabang ${branchName || 'penerima'}.`;
      link = '/transfers.html?highlight=history';
    }
    
    if (title) {
      await new Notification({
        branchCode: process.env.BRANCH_CODE,
        title,
        message,
        link
      }).save();
    }
    
    res.json({ message: 'Sync OK' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- P2P Endpoints (Dipanggil oleh API backend cabang lain) ---

// Menerima request masuk dari cabang lain
router.post('/incoming-request', async (req, res) => {
  try {
    const { fromBranch, vehicleId, requestedBy, notes } = req.body;
    
    const transfer = new Transfer({
      transferCode: `TRF-${Date.now()}`,
      fromBranch: process.env.BRANCH_CODE, // kita sebagai pemilik mobil (asal)
      toBranch: fromBranch, // peminta adalah tujuan
      vehicleId,
      requestedBy,
      notes,
      status: 'Requested'
    });
    
    await transfer.save();

    const v = await Vehicle.findById(vehicleId);
    await new Notification({
      branchCode: process.env.BRANCH_CODE,
      title: 'Request Masuk',
      message: `Cabang ${fromBranch} meminta kendaraan ${v ? v.brand + ' ' + v.model : 'Anda'}.`,
      link: '/transfers.html?highlight=ongoing'
    }).save();

    res.status(201).json(transfer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Mengambil list request transfer masuk
router.get('/incoming', async (req, res) => {
  try {
    const { status } = req.query;
    let query = { fromBranch: process.env.BRANCH_CODE };
    if (status) query.status = status;
    
    const transfers = await Transfer.find(query).populate('vehicleId');
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approve transfer
router.post('/:id/approve', requireAuth, async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer || transfer.status !== 'Requested') {
       return res.status(400).json({ message: 'Request tidak valid' });
    }

    transfer.status = 'Approved';
    transfer.approvedBy = req.session.userId;
    await transfer.save();

    const vehicle = await Vehicle.findById(transfer.vehicleId);
    if (vehicle) {
      vehicle.status = 'Transfer';
      await vehicle.save();
    }

    // Ping peminta untuk sync status
    const reqBranch = await Branch.findOne({ branchCode: transfer.toBranch });
    if (reqBranch) {
      axios.post(`http://${reqBranch.host}:${reqBranch.apiPort}/api/transfers/sync-status`, { 
        transferCode: transfer.transferCode, 
        status: 'Approved',
        branchName: process.env.BRANCH_CODE 
      }).catch(e => console.error(e));
    }

    res.json(transfer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Reject transfer
router.post('/:id/reject', requireAuth, async (req, res) => {
  try {
    const transfer = await Transfer.findByIdAndUpdate(req.params.id, { status: 'Rejected' }, { new: true });
    
    // Ping peminta
    const reqBranch = await Branch.findOne({ branchCode: transfer.toBranch });
    if (reqBranch) {
      axios.post(`http://${reqBranch.host}:${reqBranch.apiPort}/api/transfers/sync-status`, { 
        transferCode: transfer.transferCode, 
        status: 'Rejected',
        branchName: process.env.BRANCH_CODE
      }).catch(e => console.error(e));
    }
    
    res.json(transfer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Konfirmasi mobil tiba di cabang tujuan (Dipanggil dari frontend cabang peminta)
router.post('/:id/arrive', requireAuth, async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer || transfer.status !== 'Approved') {
       return res.status(400).json({ message: 'Transfer belum disetujui' });
    }

    transfer.status = 'Arrived';
    transfer.arrivalDate = new Date();
    await transfer.save();

    let vehicle = await Vehicle.findById(transfer.vehicleId);
    if (!vehicle) {
      try {
        const ownerBranch = await Branch.findOne({ branchCode: transfer.fromBranch });
        const vRes = await axios.get(`http://${ownerBranch.host}:${ownerBranch.apiPort}/api/vehicles/${transfer.vehicleId}`);
        if (vRes.data) {
          const vData = { ...vRes.data };
          delete vData._id;
          vehicle = await Vehicle.findByIdAndUpdate(transfer.vehicleId, vData, { upsert: true, new: true, setDefaultsOnInsert: true });
        }
      } catch (e) {
        console.error('Gagal fetch data kendaraan saat tiba:', e.message);
      }
    }

    if (vehicle) {
      vehicle.status = 'Available';
      vehicle.currentBranch = process.env.BRANCH_CODE;
      await vehicle.save();
    }

    // Ping pemilik asli (fromBranch)
    const ownerBranch = await Branch.findOne({ branchCode: transfer.fromBranch });
    if (ownerBranch) {
      axios.post(`http://${ownerBranch.host}:${ownerBranch.apiPort}/api/transfers/sync-status`, { 
        transferCode: transfer.transferCode, 
        status: 'Arrived',
        branchName: process.env.BRANCH_CODE,
        vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Anda'
      }).catch(e => console.error(e));
    }

    res.json(transfer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
