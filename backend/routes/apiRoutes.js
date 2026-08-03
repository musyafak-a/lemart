const express = require('express');
const router = express.Router();
const { scanBarcode, checkoutTransaction, restockProduct } = require('../controllers/scanController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Mode testing: /api/scan dibuka tanpa butuh token login
router.post('/scan', scanBarcode);
router.post('/checkout', verifyToken, checkoutTransaction);
router.post('/restock', verifyToken, requireRole(['admin', 'gudang']), restockProduct);

module.exports = router;
