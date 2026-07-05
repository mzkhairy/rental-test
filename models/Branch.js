const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branchCode: { type: String, required: true, unique: true },
  branchName: { type: String, required: true },
  city: { type: String, required: true },
  address: { type: String, required: true },
  host: { type: String, required: true },
  apiPort: { type: Number, required: true },
  databaseName: { type: String, default: 'rentsync' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);
