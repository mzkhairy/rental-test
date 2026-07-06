const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
  transferCode: { type: String, required: true, unique: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  rentalBranch: { type: String },
  fromBranch: { type: String, required: true },
  toBranch: { type: String, required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  requestDate: { type: Date, default: Date.now },
  departureDate: { type: Date },
  arrivalDate: { type: Date },
  status: { 
    type: String, 
    enum: ['Requested', 'Approved', 'Rejected', 'In Transit', 'Arrived', 'Cancelled', 'Completed'],
    default: 'Requested'
  },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Transfer', transferSchema);
