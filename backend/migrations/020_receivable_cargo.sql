SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts_receivable' AND COLUMN_NAME = 'carga');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE accounts_receivable ADD COLUMN carga VARCHAR(255) NULL AFTER description', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
