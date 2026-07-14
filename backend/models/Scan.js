const mongoose = require('mongoose');

const ScanSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  trackingId: {
    type: String,
    required: true,
    index: true
  },
  courierId: {
    type: String,
    required: true
  },
  weight: {
    type: Number,
    default: 0.00
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'scanned'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Scan', ScanSchema);
