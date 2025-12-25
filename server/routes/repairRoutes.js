const express = require('express');
const router = express.Router();

const {
  createRepair,
  getRepairs,
  getRepairById,
  updateRepair,
  addRepairNote,
  addRepairMedia,
  approveRepair,
  scheduleRepair,
  closeRepair,
  updateRepairIssue
} = require('../controllers/repairController');

const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getRepairs);
router.post('/', protect, authorize('super_admin', 'admin', 'office'), createRepair);

router.get('/:id', protect, getRepairById);
router.put('/:id', protect, authorize('super_admin', 'admin', 'office'), updateRepair);

router.post('/:id/notes', protect, authorize('super_admin', 'admin', 'office', 'installer'), addRepairNote);
router.post('/:id/media', protect, authorize('super_admin', 'admin', 'office', 'installer'), addRepairMedia);

router.post('/:id/approve', protect, authorize('super_admin', 'admin', 'office'), approveRepair);
router.post('/:id/schedule', protect, authorize('super_admin', 'admin', 'office'), scheduleRepair);
router.post('/:id/close', protect, authorize('super_admin', 'admin', 'office'), closeRepair);

router.put('/:id/issue', protect, authorize('super_admin', 'admin', 'office'), updateRepairIssue);

module.exports = router;

