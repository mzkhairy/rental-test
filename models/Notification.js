const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  branchCode: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
