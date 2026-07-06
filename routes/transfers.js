const express = require('express');
const router = express.Router();
const axios = require('axios');
const Transfer = require('../models/Transfer');
const Vehicle = require('../models/Vehicle');
const Branch = require('../models/Branch');
const Notification = require('../models/Notification');
const Rental = require('../models/Rental');
const Customer = require('../models/Customer');
const requireAuth = require('../middleware/requireAuth');

// Ambil riwayat transfer (sebagai asal atau tujuan)
router.get('/', requireAuth, async (req, res) => {
  try {
    const transfers = await Transfer.find({
      $or: [
        { fromBranch: process.env.BRANCH_CODE },
        { toBranch: process.env.BRANCH_CODE },
        { rentalBranch: process.env.BRANCH_CODE }
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
    const { transferCode, status, vehicleName, vehiclePlate, branchName } = req.body;
    let updateData = { status };
    if (vehicleName) updateData.vehicleName = vehicleName;
    if (vehiclePlate) updateData.vehiclePlate = vehiclePlate;
    const transfer = await Transfer.findOneAndUpdate({ transferCode }, updateData, { new: true });
    if (transfer) {
      if (status === 'Rejected') {
         await Rental.findOneAndUpdate({ transferId: transfer._id }, { status: 'Cancelled' });
         if (transfer.fromBranch === process.env.BRANCH_CODE) {
           await Vehicle.findByIdAndUpdate(transfer.vehicleId, { status: 'Available' });
         }
      } else if (status === 'Arrived') {
         if (transfer.rentalBranch === process.env.BRANCH_CODE) {
           await Rental.findOneAndUpdate({ transferId: transfer._id }, { status: 'Active' });
         }
         if (transfer.fromBranch === process.env.BRANCH_CODE) {
           await Vehicle.findByIdAndUpdate(transfer.vehicleId, { status: 'Rented by Request' });
         }
      } else if (status === 'Waiting Return') {
         if (transfer.rentalBranch === process.env.BRANCH_CODE) {
           await Rental.findOneAndUpdate({ transferId: transfer._id }, { status: 'Waiting Return' });
         }
      } else if (status === 'Completed') {
         if (transfer.rentalBranch === process.env.BRANCH_CODE) {
           const r = await Rental.findOneAndUpdate({ transferId: transfer._id }, { status: 'Completed', actualReturnDate: new Date() });
           if (r) await Customer.findByIdAndUpdate(r.customerId, { isRenting: false });
         }
         if (transfer.fromBranch === process.env.BRANCH_CODE) {
           await Vehicle.findByIdAndUpdate(transfer.vehicleId, { status: 'Available' });
         }
      }
    }

    // Create Notification
    let title = '';
    let message = '';
    let link = '';

    if (status === 'Approved') {
      title = 'Request Disetujui';
      message = `Cabang ${branchName || 'lain'} menyetujui request kendaraan.`;
      link = '/rentals.html';
    } else if (status === 'Rejected') {
      title = 'Request Ditolak';
      message = `Cabang ${branchName || 'lain'} menolak request kendaraan.`;
      link = '/rentals.html';
    } else if (status === 'Arrived') {
      title = 'Mobil Siap Digunakan';
      message = `Mobil telah disiapkan/tiba di Cabang ${branchName || 'penerima'}.`;
      link = '/rentals.html';
    } else if (status === 'Requested') {
      title = 'Request Masuk / Diproses';
      message = `Cabang ${branchName || 'lain'} telah memproses pembayaran untuk transaksi.`;
      link = '/rentals.html?highlight=ongoing';
    } else if (status === 'Waiting Return') {
      title = 'Kendaraan Dikembalikan';
      message = `Cabang ${branchName || 'lain'} sedang mengembalikan kendaraan, mohon konfirmasi pengembalian.`;
      link = '/rentals.html';
    } else if (status === 'Completed') {
      title = 'Pengembalian Dikonfirmasi';
      message = `Cabang ${branchName || 'lain'} telah mengkonfirmasi pengembalian kendaraan.`;
      link = '/rentals.html';
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
    const { rentalBranch, ownerBranch, destinationBranch, vehicleId, vehicleName, vehiclePlate, startDate, totalDays, requestedBy, notes, status, transferCode } = req.body;
    
    let v = await Vehicle.findById(vehicleId);
    if (!v) v = await Vehicle.findOne({ vehicleCode: vehicleId }); 

    const code = transferCode || 'TRF-' + Date.now();

    const transfer = new Transfer({
      transferCode: code,
      rentalBranch,
      fromBranch: ownerBranch || process.env.BRANCH_CODE, // ownerBranch
      toBranch: destinationBranch, // destinationBranch
      vehicleId: v ? v._id : vehicleId,
      vehicleName: vehicleName || (v ? `${v.brand} ${v.model}` : undefined),
      vehiclePlate: vehiclePlate || (v ? v.plateNumber : undefined),
      startDate,
      totalDays,
      expectedRentFinishDate: startDate && totalDays ? new Date(new Date(startDate).getTime() + totalDays * 24 * 60 * 60 * 1000) : undefined,
      requestedBy,
      notes,
      status: status || 'Requested'
    });

    await transfer.save();
    
    // Removed v.status = 'Booked'

    let title = 'Request Kendaraan';
    let message = `Cabang ${rentalBranch} telah membayar sewa untuk kendaraan ${v ? v.brand + ' ' + v.model : 'Anda'}.`;

    if (ownerBranch === process.env.BRANCH_CODE && destinationBranch === process.env.BRANCH_CODE) {
      message += ` (Digunakan/diambil di cabang Anda)`;
    } else if (ownerBranch === process.env.BRANCH_CODE) {
      message += ` (Kirim ke Cabang ${destinationBranch})`;
    } else if (destinationBranch === process.env.BRANCH_CODE) {
      message = `Bersiap menerima kendaraan ${v ? v.brand + ' ' + v.model : ''} dari Cabang ${ownerBranch} untuk transaksi Cabang ${rentalBranch}.`;
    }

    await new Notification({
      branchCode: process.env.BRANCH_CODE,
      title,
      message,
      link: '/rentals.html?highlight=ongoing'
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

    const isSameBranch = transfer.toBranch === process.env.BRANCH_CODE;
    transfer.status = isSameBranch ? 'Arrived' : 'Approved';
    transfer.approvedBy = req.session.userId;
    if (isSameBranch) transfer.arrivalDate = new Date();
    await transfer.save();

    const vehicle = await Vehicle.findById(transfer.vehicleId);
    if (vehicle) {
      vehicle.status = isSameBranch ? 'Rented by Request' : 'Transfer';
      await vehicle.save();
    }

    // Ping sync-status to rentalBranch and destinationBranch
    const branchesToNotify = new Set([transfer.rentalBranch, transfer.fromBranch, transfer.toBranch]);
    branchesToNotify.delete(process.env.BRANCH_CODE); // don't notify self

    for (const bCode of branchesToNotify) {
      if (bCode) {
        const b = await Branch.findOne({ branchCode: bCode });
        if (b) {
          axios.post(`http://${b.host}:${b.apiPort}/api/transfers/sync-status`, {
            transferCode: transfer.transferCode,
            status: transfer.status,
            branchName: process.env.BRANCH_CODE
          }).catch(e => console.error("Gagal sync status approve ke", bCode, e.message));
        }
      }
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

// Konfirmasi mobil tiba di cabang tujuan (Dipanggil dari frontend cabang tujuan)
router.post('/:id/arrive', requireAuth, async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer || transfer.status !== 'Approved') {
      return res.status(400).json({ message: 'Transfer belum disetujui' });
    }

    transfer.status = 'Arrived';
    transfer.arrivalDate = new Date();
    await transfer.save();

    if (transfer.rentalBranch === process.env.BRANCH_CODE) {
      await Rental.findOneAndUpdate({ transferId: transfer._id }, { status: 'Active' });
    }
    if (transfer.fromBranch === process.env.BRANCH_CODE) {
      await Vehicle.findByIdAndUpdate(transfer.vehicleId, { status: 'Rented by Request' });
    }

    // Ping sync-status to rentalBranch and ownerBranch
    const branchesToNotify = new Set([transfer.rentalBranch, transfer.fromBranch, transfer.toBranch]);
    branchesToNotify.delete(process.env.BRANCH_CODE); 

    for (const bCode of branchesToNotify) {
      if (bCode) {
        const b = await Branch.findOne({ branchCode: bCode });
        if (b) {
          axios.post(`http://${b.host}:${b.apiPort}/api/transfers/sync-status`, {
            transferCode: transfer.transferCode,
            status: 'Arrived',
            branchName: process.env.BRANCH_CODE
          }).catch(e => console.error("Gagal sync status arrive ke", bCode, e.message));
        }
      }
    }

    res.json(transfer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Cabang peminta mengembalikan kendaraan (kemudian menunggu konfirmasi dari pemilik)
router.post('/:id/return', requireAuth, async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer || transfer.status !== 'Arrived') {
      return res.status(400).json({ message: 'Status mobil belum tiba atau sudah selesai' });
    }

    transfer.status = 'Waiting Return';
    await transfer.save();

    if (transfer.rentalBranch === process.env.BRANCH_CODE) {
      await Rental.findOneAndUpdate({ transferId: transfer._id }, { status: 'Waiting Return' });
    }

    const branchesToNotify = new Set([transfer.rentalBranch, transfer.fromBranch, transfer.toBranch]);
    branchesToNotify.delete(process.env.BRANCH_CODE); 

    for (const bCode of branchesToNotify) {
      if (bCode) {
        const b = await Branch.findOne({ branchCode: bCode });
        if (b) {
          axios.post(`http://${b.host}:${b.apiPort}/api/transfers/sync-status`, {
            transferCode: transfer.transferCode,
            status: 'Waiting Return',
            branchName: process.env.BRANCH_CODE
          }).catch(e => console.error("Gagal sync status return ke", bCode, e.message));
        }
      }
    }

    res.json(transfer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Konfirmasi pengembalian kendaraan (Dipanggil oleh cabang pemilik)
router.post('/:id/complete', requireAuth, async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    const isSelf = transfer.fromBranch === transfer.toBranch;
    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }
    
    // Jika bukan isSelf, status harus Waiting Return
    // Jika isSelf, boleh langsung dari Arrived
    if (!isSelf && transfer.status !== 'Waiting Return') {
      return res.status(400).json({ message: 'Status mobil bukan sedang dikembalikan' });
    }
    if (isSelf && transfer.status !== 'Arrived' && transfer.status !== 'Waiting Return') {
      return res.status(400).json({ message: 'Status mobil belum tiba' });
    }

    transfer.status = 'Completed';
    await transfer.save();

    // Jika cabang tujuan (kita) juga adalah pemilik asli mobil, langsung kembalikan ke Available
    if (transfer.fromBranch === process.env.BRANCH_CODE) {
      await Vehicle.findByIdAndUpdate(transfer.vehicleId, { status: 'Available' });
    }

    // Ping sync-status to rentalBranch and ownerBranch
    const branchesToNotify = new Set([transfer.rentalBranch, transfer.fromBranch, transfer.toBranch]);
    branchesToNotify.delete(process.env.BRANCH_CODE); 

    for (const bCode of branchesToNotify) {
      if (bCode) {
        const b = await Branch.findOne({ branchCode: bCode });
        if (b) {
          axios.post(`http://${b.host}:${b.apiPort}/api/transfers/sync-status`, {
            transferCode: transfer.transferCode,
            status: 'Completed',
            branchName: process.env.BRANCH_CODE
          }).catch(e => console.error("Gagal sync status complete ke", bCode, e.message));
        }
      }
    }

    res.json(transfer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
