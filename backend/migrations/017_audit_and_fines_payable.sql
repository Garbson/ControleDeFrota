USE controlefrota;

-- Trilha de auditoria das alterações feitas pela API.
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  user_name VARCHAR(100) NULL,
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NULL,
  method VARCHAR(10) NOT NULL,
  route VARCHAR(255) NOT NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_created_at (created_at),
  INDEX idx_audit_user_id (user_id),
  INDEX idx_audit_entity (entity, entity_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Multas passam a ser uma categoria financeira explícita.
ALTER TABLE accounts_payable
  MODIFY COLUMN category ENUM(
    'manutencao','pecas','pneus','combustivel','administrativo','multas','outros'
  ) NOT NULL DEFAULT 'outros';

ALTER TABLE fines
  ADD COLUMN account_payable_id INT UNSIGNED NULL AFTER paid_date,
  ADD UNIQUE INDEX uq_fines_account_payable (account_payable_id),
  ADD CONSTRAINT fk_fines_account_payable
    FOREIGN KEY (account_payable_id) REFERENCES accounts_payable(id) ON DELETE SET NULL;

-- Reconcilia multas antigas para que apareçam em Contas a Pagar e relatórios.
INSERT INTO accounts_payable (
  document, description, driver_id, vehicle_id, category, value,
  issue_date, due_date, paid_date, status, obs
)
SELECT
  CONCAT('MULTA-', f.id),
  CONCAT('Multa: ', COALESCE(NULLIF(f.description, ''), f.category, 'Infração de trânsito')),
  f.driver_id,
  v.id,
  'multas',
  f.value,
  f.fine_date,
  COALESCE(f.due_date, f.fine_date),
  f.paid_date,
  CASE
    WHEN f.status = 'pago' THEN 'pago'
    WHEN f.status = 'recurso' THEN 'cancelado'
    ELSE 'pendente'
  END,
  f.obs
FROM fines f
LEFT JOIN vehicles v ON UPPER(v.plate) = UPPER(f.vehicle_plate)
WHERE f.account_payable_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM accounts_payable ap WHERE ap.document = CONCAT('MULTA-', f.id)
  );

UPDATE fines f
JOIN accounts_payable ap ON ap.document = CONCAT('MULTA-', f.id)
SET f.account_payable_id = ap.id
WHERE f.account_payable_id IS NULL;
