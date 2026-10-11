-- Motorista e placa em texto livre nas contas a pagar (quando não há cadastro).
-- Idempotente: em produção as colunas já foram criadas manualmente.

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts_payable' AND COLUMN_NAME = 'driver_name_free');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE accounts_payable ADD COLUMN driver_name_free VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts_payable' AND COLUMN_NAME = 'vehicle_plate_free');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE accounts_payable ADD COLUMN vehicle_plate_free VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
