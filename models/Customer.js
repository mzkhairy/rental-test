const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerCode: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  identityNumber: { type: String, required: true, unique: true },
  driverLicense: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  branchCode: { type: String, required: true },
  isRenting: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
