-- Seed Roles
INSERT INTO roles (id, name, description) VALUES 
(1, 'admin', 'Administrator dengan akses penuh'),
(2, 'gudang', 'Staf Gudang untuk manajemen stok'),
(3, 'kasir', 'Kasir untuk memproses transaksi ritel');

-- Seed Users
-- Password 'password123' dihash dengan bcrypt
INSERT INTO users (role_id, username, password_hash, full_name) VALUES
(1, 'admin', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Super Admin'),
(2, 'gudang1', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Staf Gudang 1'),
(3, 'kasir1', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Kasir 1');

-- Seed Categories
INSERT INTO categories (id, name, description) VALUES
(1, 'Minuman', 'Berbagai jenis minuman ringan dan air mineral'),
(2, 'Makanan Ringan', 'Camilan dan makanan ringan'),
(3, 'Sembako', 'Kebutuhan pokok sehari-hari'),
(4, 'Kebersihan', 'Sabun, sampo, dan alat kebersihan'),
(5, 'Alat Tulis', 'Buku, pulpen, dan perlengkapan sekolah');

-- Seed Products
INSERT INTO products (category_id, barcode, name, price, stock, min_stock) VALUES
(1, '8999999000014', 'Aqua Botol 600ml', 3500, 100, 24),
(2, '8999999000021', 'Indomie Goreng', 3000, 200, 50),
(3, '8999999000038', 'Beras Sania 5Kg', 65000, 20, 5),
(4, '8999999000045', 'Rinso Anti Noda 700g', 21000, 30, 10),
(5, '8999999000052', 'Buku Tulis Sinar Dunia 58lbr', 4500, 50, 15);
