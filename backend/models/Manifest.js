const mongoose = require('mongoose');

const manifestSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  driverName: {
    type: String,
    default: ''
  },
  totalQty: {
    type: Number,
    required: true
  },
  totalWeight: {
    type: Number,
    required: true
  },
  parcels: [
    {
      trackingId: { type: String, required: true },
      courierId: { type: String, required: true },
      weight: { type: Number, required: true },
      status: { type: String, enum: ['Pending', 'Delivered'], default: 'Pending' }
    }
  ],
  status: {
    type: String,
    enum: ['Pending', 'Delivered'],
    default: 'Pending'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  signedCopy: {
    type: String,
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model('Manifest', manifestSchema);
