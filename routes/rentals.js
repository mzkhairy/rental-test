const express = require('express');
const router = express.Router();
const axios = require('axios');
const Rental = require('../models/Rental');
const Vehicle = require('../models/Vehicle');
const Customer = require('../models/Customer');
const Branch = require('../models/Branch');
const Transfer = require('../models/Transfer');
const requireAuth = require('../middleware/requireAuth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const rentals = await Rental.find({ rentalBranch: process.env.BRANCH_CODE })
      .populate('customerId vehicleId handledBy transferId');
    res.json(rentals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { vehicleId, customerId, totalDays, totalPrice, startDate, expectedRentFinishDate, targetBranchCode } = req.body;

    if (!startDate || !expectedRentFinishDate) {
      return res.status(400).json({ message: 'Tanggal mulai dan selesai wajib diisi' });
    }

    const start = new Date(startDate);
    const end = new Date(expectedRentFinishDate);

    let vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle && targetBranchCode) {
      const targetBranch = await Branch.findOne({ branchCode: targetBranchCode });
      if (targetBranch) {
        const vRes = await axios.get(`http://${targetBranch.host}:${targetBranch.apiPort}/api/vehicles/${vehicleId}`);
        if (vRes.data) {
          const vData = { ...vRes.data };
          delete vData._id;
          vehicle = await Vehicle.findByIdAndUpdate(vehicleId, vData, { upsert: true, new: true, setDefaultsOnInsert: true });
        }
      }
    }

    if (!vehicle) return res.status(400).json({ message: 'Kendaraan tidak ditemukan' });

    const overlappingRentals = await Rental.find({
      vehicleId,
      status: { $in: ['Pending', 'Waiting Transfer', 'Pending Payment', 'Active'] },
      $or: [
        { startDate: { $lte: end }, expectedRentFinishDate: { $gte: start } }
      ]
    });

    if (overlappingRentals.length > 0) {
      return res.status(400).json({ message: 'Kendaraan sudah ter-booking pada tanggal tersebut' });
    }

    const isCrossBranch = Boolean(targetBranchCode && targetBranchCode !== process.env.BRANCH_CODE);

    const rental = new Rental({
      rentalCode: req.body.rentalCode || 'RNT-' + Date.now(),
      vehicleId,
      customerId,
      totalDays,
      totalPrice,
      startDate: start,
      expectedRentFinishDate: end,
      handledBy: req.session.userId,
      pickupBranch: req.body.pickupBranch || process.env.BRANCH_CODE,
      returnBranch: req.body.pickupBranch || process.env.BRANCH_CODE,
      ownerBranch: targetBranchCode || process.env.BRANCH_CODE,
      rentalBranch: process.env.BRANCH_CODE,
      isCrossBranch,
      status: 'Pending Payment'
    });

    await rental.save();

    if (!isCrossBranch) {
      const vLocal = await Vehicle.findById(vehicleId);
      if (vLocal) {
        vLocal.status = 'Booked';
        await vLocal.save();
      }
    }

    res.status(201).json(rental);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental || rental.status !== 'Pending Payment') {
      return res.status(400).json({ message: 'Hanya penyewaan dengan status Pending Payment yang dapat diedit' });
    }

    const { vehicleId, customerId, totalDays, totalPrice, startDate, expectedRentFinishDate, targetBranchCode } = req.body;

    if (!startDate || !expectedRentFinishDate) {
      return res.status(400).json({ message: 'Tanggal mulai dan selesai wajib diisi' });
    }

    const isCrossBranch = Boolean(targetBranchCode && targetBranchCode !== process.env.BRANCH_CODE);
    
    if (rental.vehicleId.toString() !== vehicleId) {
      // Free old vehicle if it was local
      if (!rental.isCrossBranch) {
        await Vehicle.findByIdAndUpdate(rental.vehicleId, { status: 'Available' });
      }
      
      // Book new vehicle if it is local
      if (!isCrossBranch) {
        const vLocal = await Vehicle.findById(vehicleId);
        if (vLocal) {
          vLocal.status = 'Booked';
          await vLocal.save();
        }
      }
    }

    rental.vehicleId = vehicleId;
    rental.customerId = customerId;
    rental.startDate = new Date(startDate);
    rental.expectedRentFinishDate = new Date(expectedRentFinishDate);
    rental.totalDays = totalDays;
    rental.totalPrice = totalPrice;
    rental.isCrossBranch = isCrossBranch;
    rental.ownerBranch = isCrossBranch ? targetBranchCode : process.env.BRANCH_CODE;
    rental.pickupBranch = req.body.pickupBranch || process.env.BRANCH_CODE;
    rental.returnBranch = req.body.pickupBranch || process.env.BRANCH_CODE;

    await rental.save();
    res.json(rental);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/confirm-payment', requireAuth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental || rental.status !== 'Pending Payment') return res.status(400).json({ message: 'Status tidak valid' });

    if (rental.isCrossBranch) {
      rental.status = 'Waiting Transfer';
      await rental.save();

      const ownerBranchCode = rental.ownerBranch;
      const destinationBranchCode = rental.pickupBranch;
      const ownerBranch = await Branch.findOne({ branchCode: ownerBranchCode });
      const vehicle = await Vehicle.findById(rental.vehicleId);
      const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : undefined;
      const vehiclePlate = vehicle ? vehicle.plateNumber : undefined;

      if (ownerBranch) {
        try {
          const targetUrl = `http://${ownerBranch.host}:${ownerBranch.apiPort}/api/transfers/incoming-request`;
          const response = await axios.post(targetUrl, {
            rentalBranch: process.env.BRANCH_CODE,
            ownerBranch: ownerBranchCode,
            destinationBranch: destinationBranchCode,
            vehicleId: rental.vehicleId,
            vehicleName,
            vehiclePlate,
            startDate: rental.startDate,
            totalDays: rental.totalDays,
            requestedBy: rental.handledBy,
            notes: `Paid Booking ${rental.rentalCode}`,
            status: 'Requested'
          });

          const localTransfer = new Transfer({
            transferCode: response.data.transferCode,
            rentalBranch: process.env.BRANCH_CODE,
            fromBranch: ownerBranchCode,
            toBranch: destinationBranchCode,
            vehicleId: rental.vehicleId,
            vehicleName,
            vehiclePlate,
            startDate: rental.startDate,
            totalDays: rental.totalDays,
            requestedBy: rental.handledBy,
            notes: `Paid Booking ${rental.rentalCode}`,
            status: 'Requested'
          });
          await localTransfer.save();
          rental.transferId = localTransfer._id;
          await rental.save();

          if (destinationBranchCode !== ownerBranchCode && destinationBranchCode !== process.env.BRANCH_CODE) {
            const destBranch = await Branch.findOne({ branchCode: destinationBranchCode });
            if (destBranch) {
              axios.post(`http://${destBranch.host}:${destBranch.apiPort}/api/transfers/incoming-request`, {
                transferCode: response.data.transferCode,
                rentalBranch: process.env.BRANCH_CODE,
                ownerBranch: ownerBranchCode,
                destinationBranch: destinationBranchCode,
                vehicleId: rental.vehicleId,
                vehicleName,
                vehiclePlate,
                startDate: rental.startDate,
                totalDays: rental.totalDays,
                requestedBy: rental.handledBy,
                notes: `Expect incoming car from ${ownerBranchCode}`,
                status: 'Requested'
              }).catch(e => console.error("Gagal info dest branch", e.message));
            }
          }
        } catch (err) {
          console.error("Gagal integrasi transfer P2P", err.message);
        }
      }
    } else {
      rental.status = 'Active';
      await rental.save();

      const vehicle = await Vehicle.findById(rental.vehicleId);
      if (vehicle) {
        vehicle.status = 'Rented';
        await vehicle.save();
      }
    }

    await Customer.findByIdAndUpdate(rental.customerId, { isRenting: true });
    res.json(rental);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/arrive', requireAuth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental || rental.status !== 'Waiting Transfer') return res.status(400).json({ message: 'Status tidak valid' });

    if (rental.transferId) {
      const transfer = await Transfer.findById(rental.transferId);
      if (transfer && transfer.status === 'Approved') {
        transfer.status = 'Arrived';
        transfer.arrivalDate = new Date();
        await transfer.save();

        let vehicle = await Vehicle.findById(transfer.vehicleId);
        if (vehicle) {
          vehicle.status = 'Available';
          vehicle.currentBranch = process.env.BRANCH_CODE;
          await vehicle.save();
        }

        const ownerBranch = await Branch.findOne({ branchCode: transfer.fromBranch });
        if (ownerBranch) {
          axios.post(`http://${ownerBranch.host}:${ownerBranch.apiPort}/api/transfers/sync-status`, {
            transferCode: transfer.transferCode,
            status: 'Arrived',
            branchName: process.env.BRANCH_CODE,
            vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Anda'
          }).catch(e => console.error(e));
        }
      } else {
        return res.status(400).json({ message: 'Transfer belum di-approve oleh cabang pemilik' });
      }
    }

    rental.status = 'Active';
    await rental.save();

    // Update customer isRenting status if needed
    await Customer.findByIdAndUpdate(rental.customerId, { isRenting: true });

    res.json(rental);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental || (rental.status !== 'Pending Payment' && rental.status !== 'Waiting Transfer')) {
      return res.status(400).json({ message: 'Hanya bisa membatalkan transaksi pending atau waiting transfer' });
    }

    rental.status = 'Cancelled';
    await rental.save();

    if (rental.transferId) {
      const transfer = await Transfer.findById(rental.transferId);
      if (transfer && transfer.status !== 'Arrived' && transfer.status !== 'Rejected') {
        transfer.status = 'Rejected';
        await transfer.save();

        const ownerBranch = await Branch.findOne({ branchCode: transfer.fromBranch });
        if (ownerBranch) {
          axios.post(`http://${ownerBranch.host}:${ownerBranch.apiPort}/api/transfers/sync-status`, {
            transferCode: transfer.transferCode,
            status: 'Rejected',
            branchName: process.env.BRANCH_CODE
          }).catch(e => console.error(e));
        }
      }
    }

    const vehicle = await Vehicle.findById(rental.vehicleId);
    if (vehicle && !rental.isCrossBranch) {
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
