-- Seed Roles
INSERT INTO roles (id, role_name) VALUES 
(1, 'Admin'),
(2, 'Gudang'),
(3, 'Kasir');

-- Seed Users (Password 'password123' bcrypt hashed)
INSERT INTO users (role_id, name, username, password, is_active) VALUES
(1, 'Super Admin', 'admin', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', TRUE),
(2, 'Staf Gudang 1', 'gudang1', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', TRUE),
(3, 'Kasir Utama', 'kasir1', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', TRUE);

-- Seed Categories
INSERT INTO categories (id, category_name) VALUES
(1, 'Minuman'),
(2, 'Makanan Ringan'),
(3, 'Sembako'),
(4, 'Kebersihan'),
(5, 'Alat Tulis');

-- Seed Products
INSERT INTO products (category_id, barcode, brand, variant_name, price, stock, min_stock) VALUES
(1, '8999999000014', 'Aqua', 'Air Mineral Botol 600ml', 3500.00, 100, 24),
(1, '8992753033744', 'Frisian Flag', 'Susu UHT Cokelat 225ml', 6500.00, 50, 10),
(2, '8999999000021', 'Indomie', 'Goreng Spesial 85g', 3000.00, 200, 50),
(3, '8999999000038', 'Beras Sania', 'Super Premium 5Kg', 65000.00, 20, 5),
(4, '8999999000045', 'Rinso', 'Anti Noda Deterjen 700g', 21000.00, 30, 10);
