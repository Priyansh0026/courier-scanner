const Scan = require('../models/Scan');

/**
 * Fetch all scans logged by the authenticated operator
 * GET /api/scans
 */
const getScans = async (req, res) => {
  const userId = req.user._id;

  try {
    const scans = await Scan.find({ user: userId }).sort({ timestamp: -1 });

    return res.status(200).json({
      success: true,
      scans
    });
  } catch (error) {
    console.error('[JCMS Scan Controller] Fetch scans error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve scan records. Database error.'
    });
  }
};

/**
 * Save a new scan record log
 * POST /api/scans
 */
const createScan = async (req, res) => {
  const { id, trackingId, courierId, weight, notes, status, timestamp } = req.body;
  const userId = req.user._id;

  if (!id || !trackingId || !courierId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required scan payload attributes.'
    });
  }

  try {
    const scanTime = timestamp ? new Date(timestamp) : new Date();

    // Check duplicate
    const exists = await Scan.findOne({ id });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: `Scan record transaction "${id}" already exists.`
      });
    }

    // Insert scan entry into MongoDB
    const scan = await Scan.create({
      id,
      trackingId,
      courierId,
      weight: weight || 0.0,
      notes: notes || '',
      status: status || 'scanned',
      user: userId,
      timestamp: scanTime
    });

    return res.status(201).json({
      success: true,
      message: 'Scan record saved successfully!',
      scan
    });
  } catch (error) {
    console.error('[JCMS Scan Controller] Save scan error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to save scan record. Database error.'
    });
  }
};

const deleteScans = async (req, res) => {
  const userId = req.user._id;

  try {
    await Scan.deleteMany({ user: userId });

    return res.status(200).json({
      success: true,
      message: 'All scan records cleared successfully.'
    });
  } catch (error) {
    console.error('[JCMS Scan Controller] Clear scans error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear scan records. Database error.'
    });
  }
};

const updateScan = async (req, res) => {
  const { id } = req.params;
  const { courierId, weight, status, notes } = req.body;
  const userId = req.user._id;

  try {
    const scan = await Scan.findOne({ id, user: userId });
    
    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan record not found.'
      });
    }

    if (courierId !== undefined) scan.courierId = courierId;
    if (weight !== undefined) scan.weight = weight;
    if (status !== undefined) scan.status = status;
    if (notes !== undefined) scan.notes = notes;

    await scan.save();

    return res.status(200).json({
      success: true,
      message: 'Scan record updated successfully!',
      scan
    });
  } catch (error) {
    console.error('[JCMS Scan Controller] Update scan error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update scan record. Database error.'
    });
  }
};

module.exports = {
  getScans,
  createScan,
  deleteScans,
  updateScan
};
