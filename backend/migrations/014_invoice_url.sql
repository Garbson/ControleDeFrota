USE controlefrota;

ALTER TABLE accounts_payable
  ADD COLUMN IF NOT EXISTS invoice_url VARCHAR(500) NULL AFTER receipt_url;
