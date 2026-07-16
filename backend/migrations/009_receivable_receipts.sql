-- =========================================================
-- ControleDeFrota — Adiciona comprovante em contas a receber
-- =========================================================
USE controlefrota;

ALTER TABLE accounts_receivable
  ADD COLUMN receipt_url VARCHAR(500) NULL AFTER obs;
