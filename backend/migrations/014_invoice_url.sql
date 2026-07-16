USE controlefrota;

SET @invoice_url_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'accounts_payable'
    AND COLUMN_NAME = 'invoice_url'
);
SET @invoice_url_sql = IF(
  @invoice_url_exists = 0,
  'ALTER TABLE accounts_payable ADD COLUMN invoice_url VARCHAR(500) NULL AFTER receipt_url',
  'SELECT 1'
);
PREPARE invoice_url_stmt FROM @invoice_url_sql;
EXECUTE invoice_url_stmt;
DEALLOCATE PREPARE invoice_url_stmt;
