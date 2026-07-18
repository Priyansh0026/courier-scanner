const express = require('express');
const router = express.Router();
const Manifest = require('../models/Manifest');
const Scan = require('../models/Scan');
const { protect } = require('../middleware/authMiddleware');

// All manifest routes require authentication
router.use(protect);

// 0. GET /api/manifests/export-csv - Export CSV of all manifests and scans
router.get('/export-csv', async (req, res) => {
  try {
    const manifests = await Manifest.find({}).sort({ timestamp: -1 }).lean();
    const scans = await Scan.find({}).lean();

    const scanMap = new Map();
    scans.forEach(s => {
      scanMap.set(s.trackingId, s);
    });

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    csvContent += 'Date & Time,Manifest ID,Driver Name,Tracking ID,Courier Service,Weight (kg),Status,Notes\n';

    for (const m of manifests) {
      const dateStr = m.timestamp ? new Date(m.timestamp).toLocaleString('en-US') : 'N/A';
      const manifestId = m.id || 'N/A';
      const driver = m.driverName || 'N/A';

      if (m.parcels && m.parcels.length > 0) {
        for (const p of m.parcels) {
          const trackingId = p.trackingId || 'N/A';
          const courier = p.courierId || 'N/A';
          const weight = p.weight || '0';
          const status = p.status || 'Pending';
          
          const rawScan = scanMap.get(trackingId);
          const notes = rawScan && rawScan.notes ? rawScan.notes.replace(/"/g, '""') : '';

          csvContent += `"${dateStr}","${manifestId}","${driver}","${trackingId}","${courier}","${weight}","${status}","${notes}"\n`;
        }
      }
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=JCMS_Manifest_Export.csv');
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('[JCMS Manifest Route] Export CSV error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to export CSV report.' });
  }
});

// 1. POST /api/manifests - Create a new manifest record and update scans
router.post('/', async (req, res) => {
  try {
    const { id, driverName, totalQty, totalWeight, parcels } = req.body;

    if (!id || !totalQty || !parcels || parcels.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid manifest payload details.' });
    }

    // Check if manifest ID already exists
    const exists = await Manifest.findOne({ id });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Manifest ID already logged.' });
    }

    // Create manifest snapshot
    const manifest = await Manifest.create({
      id,
      driverName: driverName || '',
      totalQty,
      totalWeight,
      parcels,
      user: req.user._id
    });

    // Update status of individual scans to 'Pending' in DB
    const trackingIds = parcels.map(p => p.trackingId);
    await Scan.updateMany(
      { trackingId: { $in: trackingIds } },
      { status: 'Pending' }
    );

    return res.status(201).json({
      success: true,
      message: 'Manifest logged successfully!',
      manifest
    });
  } catch (err) {
    console.error('[JCMS Manifest Route] Create error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to create manifest record.' });
  }
});

// 2. GET /api/manifests - Get all manifest records (date-wise sorted newest first)
router.get('/', async (req, res) => {
  try {
    const manifests = await Manifest.find({})
      .select('-signedCopy -parcels.signedCopy')
      .sort({ timestamp: -1 });
    return res.status(200).json({ success: true, manifests });
  } catch (err) {
    console.error('[JCMS Manifest Route] Fetch error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch manifest history.' });
  }
});

// 3. PUT /api/manifests/:id/status - Update manifest status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Delivered'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid manifest status value.' });
    }

    const manifest = await Manifest.findOneAndUpdate(
      { id: req.params.id },
      { status },
      { new: true }
    );

    if (!manifest) {
      return res.status(404).json({ success: false, message: 'Manifest not found.' });
    }

    return res.status(200).json({ success: true, message: 'Status updated successfully!', manifest });
  } catch (err) {
    console.error('[JCMS Manifest Route] Update status error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update manifest status.' });
  }
});

// 4. DELETE /api/manifests/:id - Delete a manifest from history and release its scans back to 'scanned'
router.delete('/:id', async (req, res) => {
  try {
    const manifest = await Manifest.findOne({ id: req.params.id });
    if (!manifest) {
      return res.status(404).json({ success: false, message: 'Manifest not found.' });
    }

    // Reset status of all parcels back to 'scanned' in DB
    const trackingIds = manifest.parcels.map(p => p.trackingId);
    await Scan.updateMany(
      { trackingId: { $in: trackingIds } },
      { status: 'scanned' }
    );

    // Delete the manifest
    await Manifest.deleteOne({ _id: manifest._id });

    return res.status(200).json({ success: true, message: 'Manifest deleted and scans reset to scanned status.' });
  } catch (err) {
    console.error('[JCMS Manifest Route] Delete error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete manifest record.' });
  }
});

// 5. PUT /api/manifests/:id/signed-copy - Upload/update Base64 signed copy
router.put('/:id/signed-copy', async (req, res) => {
  try {
    const { signedCopy } = req.body;
    if (!signedCopy || !signedCopy.startsWith('data:image/')) {
      return res.status(400).json({ success: false, message: 'Invalid image format. Base64 data URI required.' });
    }

    const manifest = await Manifest.findOneAndUpdate(
      { id: req.params.id },
      { signedCopy },
      { new: true }
    );

    if (!manifest) {
      return res.status(404).json({ success: false, message: 'Manifest record not found.' });
    }

    return res.status(200).json({ success: true, message: 'Signed copy uploaded successfully!', manifest });
  } catch (err) {
    console.error('[JCMS Manifest Route] Signed copy upload error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to upload signed copy.' });
  }
});

// 6. DELETE /api/manifests/:id/signed-copy - Remove signed copy
router.delete('/:id/signed-copy', async (req, res) => {
  try {
    const manifest = await Manifest.findOneAndUpdate(
      { id: req.params.id },
      { signedCopy: null },
      { new: true }
    );

    if (!manifest) {
      return res.status(404).json({ success: false, message: 'Manifest record not found.' });
    }

    return res.status(200).json({ success: true, message: 'Signed copy removed.', manifest });
  } catch (err) {
    console.error('[JCMS Manifest Route] Signed copy delete error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete signed copy.' });
  }
});

// 7. PUT /api/manifests/:manifestId/parcels/:trackingId/status - Update status of an individual package inside a manifest
router.put('/:manifestId/parcels/:trackingId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { manifestId, trackingId } = req.params;

    if (!['Pending', 'Delivered'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid parcel status value.' });
    }

    // 1. Update the status inside the Manifest's parcels array
    const manifest = await Manifest.findOneAndUpdate(
      { id: manifestId, 'parcels.trackingId': trackingId },
      { $set: { 'parcels.$.status': status } },
      { new: true }
    );

    if (!manifest) {
      return res.status(404).json({ success: false, message: 'Manifest or parcel record not found.' });
    }

    // 2. Synchronize scan record status in Scan collection
    await Scan.findOneAndUpdate(
      { trackingId },
      { status }
    );

    return res.status(200).json({
      success: true,
      message: `Status of parcel ${trackingId} updated to: ${status}`,
      manifest
    });
  } catch (err) {
    console.error('[JCMS Manifest Route] Update parcel status error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update parcel status.' });
  }
});

// 8. PUT /api/manifests/:id/deliver-all - Mark all parcels in a manifest as Delivered
router.put('/:id/deliver-all', async (req, res) => {
  try {
    const manifest = await Manifest.findOne({ id: req.params.id });
    if (!manifest) {
      return res.status(404).json({ success: false, message: 'Manifest not found.' });
    }

    // 1. Mark all parcels inside this manifest as Delivered
    manifest.parcels.forEach(p => {
      p.status = 'Delivered';
    });
    manifest.status = 'Delivered';
    await manifest.save();

    // 2. Update scan records in Scan collection to 'Delivered'
    const trackingIds = manifest.parcels.map(p => p.trackingId);
    await Scan.updateMany(
      { trackingId: { $in: trackingIds } },
      { status: 'Delivered' }
    );

    return res.status(200).json({
      success: true,
      message: 'All parcels in this manifest marked as Delivered successfully!',
      manifest
    });
  } catch (err) {
    console.error('[JCMS Manifest Route] Deliver all error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update status for all parcels.' });
  }
});

// 9. PUT /api/manifests/:manifestId/parcels/:trackingId/signed-copy - Upload signed copy for an individual parcel
router.put('/:manifestId/parcels/:trackingId/signed-copy', async (req, res) => {
  try {
    const { signedCopy } = req.body;
    const { manifestId, trackingId } = req.params;

    if (!signedCopy || !signedCopy.startsWith('data:image/')) {
      return res.status(400).json({ success: false, message: 'Invalid image format. Base64 data URI required.' });
    }

    // 1. Update Manifest parcel subdocument
    const manifest = await Manifest.findOneAndUpdate(
      { id: manifestId, 'parcels.trackingId': trackingId },
      { $set: { 'parcels.$.signedCopy': signedCopy } },
      { new: true }
    );

    if (!manifest) {
      return res.status(404).json({ success: false, message: 'Manifest or parcel not found.' });
    }

    // 2. Synchronize scan record status in Scan collection
    await Scan.findOneAndUpdate(
      { trackingId },
      { signedCopy }
    );

    return res.status(200).json({
      success: true,
      message: 'Parcel signed copy uploaded successfully!',
      manifest
    });
  } catch (err) {
    console.error('[JCMS Manifest Route] Update parcel signed copy error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to upload parcel signed copy.' });
  }
});

// 10. DELETE /api/manifests/:manifestId/parcels/:trackingId/signed-copy - Remove signed copy for an individual parcel
router.delete('/:manifestId/parcels/:trackingId/signed-copy', async (req, res) => {
  try {
    const { manifestId, trackingId } = req.params;

    // 1. Update Manifest parcel subdocument to null
    const manifest = await Manifest.findOneAndUpdate(
      { id: manifestId, 'parcels.trackingId': trackingId },
      { $set: { 'parcels.$.signedCopy': null } },
      { new: true }
    );

    if (!manifest) {
      return res.status(404).json({ success: false, message: 'Manifest or parcel not found.' });
    }

    // 2. Synchronize scan record status in Scan collection to null
    await Scan.findOneAndUpdate(
      { trackingId },
      { signedCopy: null }
    );

    return res.status(200).json({
      success: true,
      message: 'Parcel signed copy removed successfully!',
      manifest
    });
  } catch (err) {
    console.error('[JCMS Manifest Route] Delete parcel signed copy error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to remove parcel signed copy.' });
  }
});

module.exports = router;
