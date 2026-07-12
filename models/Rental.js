const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
  rentalCode: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  pickupBranch: { type: String, required: true },
  returnBranch: { type: String, required: true },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  startDate: { type: Date, required: true },
  expectedRentFinishDate: { type: Date, required: true },
  actualReturnDate: { type: Date },
  totalDays: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  isCrossBranch: { type: Boolean, default: false },
  ownerBranch: { type: String },
  rentalBranch: { type: String, required: true },
  transferId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transfer' },
  status: { 
    type: String, 
    enum: ['Pending', 'Waiting Transfer', 'Pending Payment', 'Waiting Handover', 'Active', 'Completed', 'Cancelled', 'Waiting Return'],
    default: 'Pending Payment'
  }
}, { timestamps: true });

module.exports = mongoose.model('Rental', rentalSchema);
