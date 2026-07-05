const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleCode: { type: String, required: true, unique: true },
  plateNumber: { type: String, required: true, unique: true },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  category: { type: String, required: true },
  transmission: { type: String, required: true },
  seatCapacity: { type: Number, required: true },
  dailyRate: { type: Number, required: true },
  homeBranch: { type: String, required: true },
  currentBranch: { type: String, required: true },
  status: {
    type: String,
    enum: ['Available', 'Reserved', 'Rented', 'Transfer', 'Maintenance'],
    default: 'Available'
  },
  odometer: { type: Number, default: 0 },
  lastService: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
