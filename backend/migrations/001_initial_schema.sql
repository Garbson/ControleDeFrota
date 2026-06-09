-- =========================================================
-- ControleDeFrota — Schema inicial MySQL
-- =========================================================

CREATE DATABASE IF NOT EXISTS controlefrota CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE controlefrota;

-- -------------------------------------------------------
-- USUÁRIOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('admin','operador') NOT NULL DEFAULT 'operador',
  active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- MOTORISTAS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS drivers (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  cpf          VARCHAR(14),
  cnh          VARCHAR(20),
  cnh_category VARCHAR(5),
  cnh_expiry   DATE,
  phone        VARCHAR(20),
  active       TINYINT(1) NOT NULL DEFAULT 1,
  color        VARCHAR(7) NOT NULL DEFAULT '#2563eb',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- VEÍCULOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plate        VARCHAR(12) NOT NULL UNIQUE,
  type         ENUM('truck','trailer') NOT NULL,
  brand        VARCHAR(50),
  model        VARCHAR(50),
  year         YEAR,
  color        VARCHAR(30),
  renavam      VARCHAR(20),
  active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- COMBINAÇÕES MOTORISTA ↔ VEÍCULO (atual)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS driver_vehicles (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  driver_id     INT UNSIGNED NOT NULL,
  truck_id      INT UNSIGNED,
  trailer_id    INT UNSIGNED,
  trailer_type  VARCHAR(50),
  since         DATE,
  active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id)  REFERENCES drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (truck_id)   REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (trailer_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- FORNECEDORES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  cnpj       VARCHAR(18),
  phone      VARCHAR(20),
  email      VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- ESTOQUE DE PNEUS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  description VARCHAR(150) NOT NULL,
  brand       VARCHAR(80),
  nf_number   VARCHAR(30),
  status      ENUM('novo','recapado','usado') NOT NULL DEFAULT 'novo',
  qty         INT NOT NULL DEFAULT 0,
  unit_price  DECIMAL(10,2),
  supplier_id INT UNSIGNED,
  entry_date  DATE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- NOTAS FISCAIS DE COMPRA
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchases (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nf_number    VARCHAR(30) NOT NULL,
  description  TEXT,
  supplier_id  INT UNSIGNED,
  qty          INT,
  unit_price   DECIMAL(10,2),
  total_value  DECIMAL(10,2),
  issue_date   DATE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- HISTÓRICO DE PNEUS (atribuições por motorista/veículo)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS tire_assignments (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  driver_id   INT UNSIGNED,
  vehicle_id  INT UNSIGNED,
  brand       VARCHAR(100) NOT NULL,
  qty         INT NOT NULL DEFAULT 1,
  type        ENUM('novo','recapado','usado') NOT NULL DEFAULT 'novo',
  stock_item_id INT UNSIGNED,
  assigned_at DATE NOT NULL,
  obs         TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id)     REFERENCES drivers(id) ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id)    REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (stock_item_id) REFERENCES stock_items(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- MOVIMENTAÇÕES (entrada/saída do estoque)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS movements (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type          ENUM('entrada','saida') NOT NULL,
  driver_id     INT UNSIGNED,
  vehicle_id    INT UNSIGNED,
  stock_item_id INT UNSIGNED,
  qty           INT NOT NULL,
  unit_value    DECIMAL(10,2),
  total_value   DECIMAL(10,2),
  mov_date      DATE NOT NULL,
  obs           TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id)     REFERENCES drivers(id) ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id)    REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (stock_item_id) REFERENCES stock_items(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- CONTAS A PAGAR
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts_payable (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  document     VARCHAR(100),
  description  TEXT,
  supplier_id  INT UNSIGNED,
  driver_id    INT UNSIGNED,
  vehicle_id   INT UNSIGNED,
  category     ENUM('manutencao','pecas','pneus','combustivel','administrativo','outros') NOT NULL DEFAULT 'outros',
  value        DECIMAL(10,2) NOT NULL,
  issue_date   DATE,
  due_date     DATE NOT NULL,
  paid_date    DATE,
  status       ENUM('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente',
  obs          TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (driver_id)   REFERENCES drivers(id) ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id)  REFERENCES vehicles(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- CONTAS A RECEBER
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  document     VARCHAR(100),
  description  TEXT,
  client       VARCHAR(150),
  driver_id    INT UNSIGNED,
  vehicle_id   INT UNSIGNED,
  type         ENUM('frete','outros') NOT NULL DEFAULT 'frete',
  value        DECIMAL(10,2) NOT NULL,
  issue_date   DATE,
  due_date     DATE NOT NULL,
  received_date DATE,
  status       ENUM('pendente','recebido','cancelado') NOT NULL DEFAULT 'pendente',
  obs          TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id)  REFERENCES drivers(id) ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- REGISTROS DE COMBUSTÍVEL
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS fuel_records (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  driver_id   INT UNSIGNED,
  vehicle_id  INT UNSIGNED,
  liters      DECIMAL(8,2) NOT NULL,
  price_liter DECIMAL(6,3) NOT NULL,
  total       DECIMAL(10,2) NOT NULL,
  station     VARCHAR(150),
  fuel_date   DATE NOT NULL,
  obs         TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id)  REFERENCES drivers(id) ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- DESPESAS AVULSAS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  driver_id   INT UNSIGNED,
  vehicle_id  INT UNSIGNED,
  type        ENUM('pneu','combustivel','manutencao','pedagio','outros') NOT NULL,
  description TEXT,
  value       DECIMAL(10,2) NOT NULL,
  qty         INT NOT NULL DEFAULT 1,
  exp_date    DATE NOT NULL,
  obs         TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id)  REFERENCES drivers(id) ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- REFRESH TOKENS (auth)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  token      VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- -------------------------------------------------------
-- SEED INICIAL — usuário admin
-- (senha: Admin@2026 — trocar após primeiro login)
-- -------------------------------------------------------
INSERT INTO users (name, email, password, role) VALUES
('Administrador', 'admin@controlefrota.com', '$2a$12$psVHOAIvnQLbYVgT6MTRX.EIZ.1Sev9YM6XgrS3c9T8nDIee3Rn/m', 'admin');
-- senha = 'Admin@2026'  (bcrypt rounds=12, gerado com bcryptjs)
