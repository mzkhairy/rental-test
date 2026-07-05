const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  branchCode: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Driver'], required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String }, // Only filled for 'Admin' role
  salary: { type: Number },
  homeBranch: { type: String }, // specifically for 'Driver'
  currentBranch: { type: String }, // specifically for 'Driver'
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
