/**
 * scanController.js (MySQL Version - Master Spec Compliant)
 */
const pool = require("../config/db").pool;

async function scanBarcode(req, res) {
  const { barcode, mode } = req.body;

  if (!barcode) {
    return res.status(400).json({ status: "error", message: "Barcode wajib diisi." });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, barcode, brand, variant_name, price, stock, min_stock, category_id
       FROM products
       WHERE barcode = ?
       LIMIT 1`,
      [barcode]
    );

    const product = rows[0];

    if (!product) {
      return res.status(404).json({ status: "error", message: "Barang tidak terdaftar!" });
    }

    if (mode === "kasir") {
      if (product.stock <= 0) {
        return res.status(409).json({
          status: "error",
          message: `Stok ${product.brand} ${product.variant_name} habis.`,
        });
      }
      return res.status(200).json({ status: "success", data: product });
    }

    if (mode === "restock") {
      return res.status(200).json({
        status: "success",
        data: {
          ...product,
          is_low_stock: product.stock <= product.min_stock,
        },
      });
    }

    return res.status(400).json({ status: "error", message: "Mode tidak dikenali." });
  } catch (err) {
    console.error("scanBarcode error:", err);
    return res.status(500).json({ status: "error", message: "Terjadi kesalahan server." });
  }
}

async function checkoutTransaction(req, res) {
  const { items, total_price, payment_method } = req.body;
  // Default to system user ID 3 (Kasir Utama) if req.user is unauthenticated in dev
  const userId = req.user?.id || 3;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ status: "error", message: "Keranjang kosong." });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const item of items) {
      const [rows] = await connection.query(
        `SELECT stock, brand, variant_name FROM products WHERE id = ? FOR UPDATE`,
        [item.product_id || item.id]
      );

      const currentStock = rows[0]?.stock || 0;
      if (!rows[0] || currentStock < item.qty) {
        const name = rows[0] ? `${rows[0].brand} ${rows[0].variant_name}` : "Produk";
        throw Object.assign(new Error(`Stok ${name} tidak mencukupi (Tersisa: ${currentStock}).`), { statusCode: 409 });
      }
    }

    const transactionCode = `TRX-${Date.now()}`;

    const [trxResult] = await connection.query(
      `INSERT INTO transactions (transaction_code, user_id, total_price, payment_method, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [transactionCode, userId, total_price, payment_method || 'CASH']
    );
    const transactionId = trxResult.insertId;

    for (const item of items) {
      const productId = item.product_id || item.id;
      const itemSubtotal = item.subtotal || (item.price * item.qty);

      await connection.query(
        `INSERT INTO transaction_details (transaction_id, product_id, qty, subtotal)
         VALUES (?, ?, ?, ?)`,
        [transactionId, productId, item.qty, itemSubtotal]
      );

      await connection.query(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [item.qty, productId]
      );

      await connection.query(
        `INSERT INTO inventory_logs (product_id, user_id, type, qty, notes, created_at)
         VALUES (?, ?, 'OUT', ?, ?, NOW())`,
        [productId, userId, item.qty, `Checkout ${transactionCode}`]
      );
    }

    await connection.commit();

    return res.status(201).json({
      status: "success",
      message: "Transaksi checkout berhasil disimpan!",
      data: { transaction_id: transactionId, transaction_code: transactionCode },
    });
  } catch (err) {
    await connection.rollback();
    const statusCode = err.statusCode || 500;
    console.error("checkoutTransaction error:", err);
    return res.status(statusCode).json({
      status: "error",
      message: statusCode === 409 ? err.message : "Terjadi kesalahan server saat memproses transaksi.",
    });
  } finally {
    connection.release();
  }
}

async function restockProduct(req, res) {
  const { product_id, qty, notes } = req.body;
  const userId = req.user?.id || 2; // Default to Gudang user

  if (!product_id || !qty || qty <= 0) {
    return res.status(400).json({ status: "error", message: "Data restock tidak valid." });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [updateResult] = await connection.query(
      `UPDATE products SET stock = stock + ? WHERE id = ?`,
      [qty, product_id]
    );

    if (updateResult.affectedRows === 0) {
      throw Object.assign(new Error("Produk tidak ditemukan."), { statusCode: 404 });
    }

    const [rows] = await connection.query(
      `SELECT id, brand, variant_name, stock FROM products WHERE id = ?`,
      [product_id]
    );

    await connection.query(
      `INSERT INTO inventory_logs (product_id, user_id, type, qty, notes, created_at)
       VALUES (?, ?, 'IN', ?, ?, NOW())`,
      [product_id, userId, qty, notes || "Restock via webcam scan"]
    );

    await connection.commit();

    return res.status(200).json({ status: "success", data: rows[0] });
  } catch (err) {
    await connection.rollback();
    const statusCode = err.statusCode || 500;
    console.error("restockProduct error:", err);
    return res.status(statusCode).json({ status: "error", message: err.message || "Gagal restock." });
  } finally {
    connection.release();
  }
}

module.exports = { scanBarcode, checkoutTransaction, restockProduct };
