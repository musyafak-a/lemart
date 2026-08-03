/**
 * scanController.js (MySQL Version)
 */
const pool = require("../config/db").pool;

async function scanBarcode(req, res) {
  const { barcode, mode } = req.body;

  if (!barcode) {
    return res.status(400).json({ status: "error", message: "Barcode wajib diisi." });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, barcode, name, price, stock, min_stock, category_id
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
        return res.status(409).json({ status: "error", message: `Stok ${product.name} habis.` });
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
  const userId = req.user.id;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ status: "error", message: "Keranjang kosong." });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const item of items) {
      const [rows] = await connection.query(
        `SELECT stock FROM products WHERE id = ? FOR UPDATE`,
        [item.product_id]
      );

      if (!rows[0] || rows[0].stock < item.qty) {
        throw Object.assign(new Error("Stok tidak mencukupi."), { statusCode: 409 });
      }
    }

    const [trxResult] = await connection.query(
      `INSERT INTO transactions (user_id, total_amount, payment_method, created_at)
       VALUES (?, ?, ?, NOW())`,
      [userId, total_price, payment_method || 'CASH']
    );
    const transactionId = trxResult.insertId;

    for (const item of items) {
      await connection.query(
        `INSERT INTO transaction_details (transaction_id, product_id, quantity, price_at_transaction, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, item.product_id, item.qty, item.price || 0, item.subtotal]
      );

      await connection.query(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [item.qty, item.product_id]
      );

      await connection.query(
        `INSERT INTO inventory_logs (product_id, user_id, type, quantity_changed, notes, created_at)
         VALUES (?, ?, 'OUT', ?, ?, NOW())`,
        [item.product_id, userId, item.qty, `Checkout TRX-${transactionId}`]
      );
    }

    await connection.commit();

    return res.status(201).json({
      status: "success",
      message: "Transaksi berhasil.",
      data: { transaction_id: transactionId },
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
  const userId = req.user.id;

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
      `SELECT id, name, stock FROM products WHERE id = ?`,
      [product_id]
    );

    await connection.query(
      `INSERT INTO inventory_logs (product_id, user_id, type, quantity_changed, notes, created_at)
       VALUES (?, ?, 'IN', ?, ?, NOW())`,
      [product_id, userId, qty, notes || "Restock via form"]
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
