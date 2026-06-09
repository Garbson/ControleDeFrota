-- =========================================================
-- ControleDeFrota — Multas de trânsito
-- =========================================================
USE controlefrota;

CREATE TABLE IF NOT EXISTS fines (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  driver_id     INT UNSIGNED,
  vehicle_plate VARCHAR(12),
  value         DECIMAL(10,2) NOT NULL,
  fine_date     DATE NOT NULL,
  due_date      DATE,
  description   VARCHAR(255),
  category      ENUM('velocidade','semaforo','estacionamento','documentacao','outros') DEFAULT 'outros',
  status        ENUM('pendente','pago','recurso') DEFAULT 'pendente',
  paid_date     DATE,
  obs           TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
);
