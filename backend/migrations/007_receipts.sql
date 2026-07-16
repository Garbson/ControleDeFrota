-- =========================================================
-- 007_receipts — Adiciona coluna receipt_url em accounts_payable
-- =========================================================

SET @receipt_url_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'accounts_payable'
    AND COLUMN_NAME = 'receipt_url'
);
SET @receipt_url_sql = IF(
  @receipt_url_exists = 0,
  'ALTER TABLE accounts_payable ADD COLUMN receipt_url VARCHAR(500) NULL AFTER obs',
  'SELECT 1'
);
PREPARE receipt_url_stmt FROM @receipt_url_sql;
EXECUTE receipt_url_stmt;
DEALLOCATE PREPARE receipt_url_stmt;
