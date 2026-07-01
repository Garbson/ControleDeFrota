-- =========================================================
-- 008_suppliers_obs — Adiciona coluna obs em suppliers
-- =========================================================

ALTER TABLE suppliers
  ADD COLUMN obs TEXT NULL AFTER email;
