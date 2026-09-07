SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_items' AND COLUMN_NAME = 'item_type');
SET @sql = IF(@col_exists = 0, "ALTER TABLE stock_items ADD COLUMN item_type ENUM('pneu','peca') NOT NULL DEFAULT 'pneu' AFTER description", 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
