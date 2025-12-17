const express = require('express');
const router = express.Router();
// Import Controllers
const {
    getOrders, createOrder, updateOrderStatus,
    getBatchingList, markAsOrdered,
    getCustomers, getClientHistory, getClientByPhone, getOrderById, addOrderFile, searchClients, getPendingMaterials, markMaterialOrdered, getPurchasingStatus, toggleMaterialArrival,
    updateFinalInvoice,
    addOrderNote,
    updateProduction,
    updateInstallTakeList,
    updateOrderIssue
} = require('../controllers/orderController');

// Import NEW Install Controller
const { scheduleInstallation, getInstallersList, approveInstallation } = require('../controllers/installController');

const { protect, authorize } = require('../middleware/authMiddleware');

// --- Existing Routes ---
// חשוב: ראוטים עם path קבוע (כמו /batching) חייבים לבוא לפני ראוטים פרמטריים (/:id)
router.get('/', protect, getOrders);

// Batching & Clients (paths קבועים)
router.get('/clients/search', protect, searchClients);
router.get('/batching', protect, getBatchingList);
router.post('/batch-order', protect, authorize('super_admin', 'admin', 'office'), markAsOrdered);
router.get('/customers/list', protect, getCustomers);
router.get('/customers/:name/history', protect, getClientHistory);
router.get('/clients/lookup/:phone', protect, getClientByPhone);

router.get('/procurement/pending', protect, getPendingMaterials); // רשימת המתנה להזמנה
router.post('/procurement/order-item', protect, authorize('super_admin', 'admin', 'office'), markMaterialOrdered); // ביצוע הזמנה
router.get('/procurement/tracking', protect, getPurchasingStatus); // דף Purchasing
router.post('/procurement/arrive-item', protect, authorize('super_admin', 'admin', 'production'), toggleMaterialArrival); // סימון הגעה (V)

// --- NEW Installation Routes ---
// 1. Get list of installers for the dropdown
router.get('/install/team-list', protect, getInstallersList);

// 2. Assign team & schedule (Manager only)
router.post('/install/schedule', protect, authorize('super_admin', 'admin', 'office'), scheduleInstallation);

// 3. Final approval (Manager only)
router.post('/install/approve', protect, authorize('super_admin', 'admin'), approveInstallation);

// פעולות לפי מזהה הזמנה (must stay after fixed routes)
router.post('/', protect, authorize('super_admin', 'admin', 'office'), createOrder);
router.put('/:id/status', protect, updateOrderStatus);
router.put('/:id/production', protect, authorize('super_admin', 'admin', 'production'), updateProduction);
router.put('/:id/install-take-list', protect, authorize('super_admin', 'admin', 'office', 'production', 'installer'), updateInstallTakeList);
router.put('/:id/issue', protect, authorize('super_admin', 'admin', 'office'), updateOrderIssue);
router.put('/:id/final-invoice', protect, authorize('super_admin', 'admin', 'office'), updateFinalInvoice);
router.post('/:id/notes', protect, addOrderNote);
router.put('/:id/files', protect, addOrderFile);
router.get('/:id', protect, getOrderById);

module.exports = router;