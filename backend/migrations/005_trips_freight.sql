-- =========================================================
-- ControleDeFrota — Adiciona campos de frete à tabela trips
-- (migration para instâncias existentes)
-- =========================================================
USE controlefrota;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS cargo          VARCHAR(150)                                      AFTER destination,
  ADD COLUMN IF NOT EXISTS client         VARCHAR(150)                                      AFTER cargo,
  ADD COLUMN IF NOT EXISTS freight_value  DECIMAL(10,2) NOT NULL DEFAULT 0                 AFTER end_date,
  ADD COLUMN IF NOT EXISTS freight_status ENUM('a_receber','pago','sem_frete') NOT NULL
                                          DEFAULT 'sem_frete'                               AFTER freight_value,
  ADD COLUMN IF NOT EXISTS receivable_id  INT UNSIGNED NULL                                 AFTER freight_status;
