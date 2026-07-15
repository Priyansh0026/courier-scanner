const mongoose = require('mongoose');

const manifestSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
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
      status: { type: String, enum: ['Pending', 'Delivered'], default: 'Pending' },
      signedCopy: { type: String, default: null }
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

// Define compound unique index to prevent duplicate manifest IDs for a single user
// but allow duplicate IDs across different user namespaces.
manifestSchema.index({ id: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Manifest', manifestSchema);
