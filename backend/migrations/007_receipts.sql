-- =========================================================
-- 007_receipts — Adiciona coluna receipt_url em accounts_payable
-- =========================================================

ALTER TABLE accounts_payable
  ADD COLUMN receipt_url VARCHAR(500) NULL AFTER obs;
