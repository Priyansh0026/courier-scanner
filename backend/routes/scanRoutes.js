const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getScans, createScan, deleteScans, updateScan, deleteScan } = require('../controllers/scanController');

// All scan routes require user authentication
router.use(protect);

router.get('/', getScans);
router.post('/', createScan);
router.put('/:id', updateScan);
router.delete('/:id', deleteScan);
router.delete('/', deleteScans);

module.exports = router;
