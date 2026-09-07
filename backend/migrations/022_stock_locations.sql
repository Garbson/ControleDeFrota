-- Cria tabela de locais de estoque
CREATE TABLE IF NOT EXISTS stock_locations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO stock_locations (name) VALUES ('Manaus'), ('Rio Branco'), ('Cruzeiro do Sul');

-- Adiciona coluna stock_location_id se ainda não existir
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_items' AND COLUMN_NAME = 'stock_location_id');
SET @sql = IF(@col_exists = 0, "ALTER TABLE stock_items ADD COLUMN stock_location_id INT UNSIGNED NULL AFTER item_type, ADD INDEX idx_stock_location (stock_location_id)", 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Distribui itens existentes conforme a descrição
UPDATE stock_items SET stock_location_id = (SELECT id FROM stock_locations WHERE name = 'Manaus') WHERE stock_location_id IS NULL AND description LIKE '%MANAUS%';
UPDATE stock_items SET stock_location_id = (SELECT id FROM stock_locations WHERE name = 'Rio Branco') WHERE stock_location_id IS NULL AND (description LIKE '%MAXIXE%' OR description LIKE '%SIDNEI%' OR description LIKE '%SIDNEY%' OR description LIKE '%SIDENEI%' OR description LIKE '%SIDENEY%');
UPDATE stock_items SET stock_location_id = (SELECT id FROM stock_locations WHERE name = 'Cruzeiro do Sul') WHERE stock_location_id IS NULL;
