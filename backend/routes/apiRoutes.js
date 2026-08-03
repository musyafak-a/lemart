const express = require('express');
const router = express.Router();
const { scanBarcode, checkoutTransaction, restockProduct } = require('../controllers/scanController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Define API routes and attach middlewares
router.post('/scan', verifyToken, scanBarcode);
router.post('/checkout', verifyToken, checkoutTransaction);
router.post('/restock', verifyToken, requireRole(['admin', 'gudang']), restockProduct);

module.exports = router;
