-- Coluna carga (idempotente)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts_receivable' AND COLUMN_NAME = 'carga');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE accounts_receivable ADD COLUMN carga VARCHAR(255) NULL AFTER description', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Colunas weight e unit_price (idempotente)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts_receivable' AND COLUMN_NAME = 'weight');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE accounts_receivable ADD COLUMN weight DECIMAL(10,2) NULL AFTER obs', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts_receivable' AND COLUMN_NAME = 'unit_price');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE accounts_receivable ADD COLUMN unit_price DECIMAL(10,4) NULL AFTER weight', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Colunas group_id e installment_label
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts_receivable' AND COLUMN_NAME = 'group_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE accounts_receivable ADD COLUMN group_id BIGINT UNSIGNED NULL AFTER unit_price', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts_receivable' AND COLUMN_NAME = 'installment_label');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE accounts_receivable ADD COLUMN installment_label VARCHAR(50) NULL AFTER group_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS receivable_installments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  receivable_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE NULL,
  status ENUM('pendente','recebido') NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receivable_id) REFERENCES accounts_receivable(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
