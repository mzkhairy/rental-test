const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const requireAuth = require('../middleware/requireAuth');

// Ambil notifikasi (semua atau unread)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { unread } = req.query;
    let query = { branchCode: process.env.BRANCH_CODE };
    if (unread === 'true') {
      query.isRead = false;
    }
    
    // Sort descending (terbaru di atas)
    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(20);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Tandai notifikasi sudah dibaca
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    if (!notif) return res.status(404).json({ message: 'Notifikasi tidak ditemukan' });
    res.json(notif);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Tandai semua notifikasi sudah dibaca
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany({ branchCode: process.env.BRANCH_CODE, isRead: false }, { isRead: true });
    res.json({ message: 'Semua notifikasi ditandai sudah dibaca' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
