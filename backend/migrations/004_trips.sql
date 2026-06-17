-- =========================================================
-- ControleDeFrota — Viagens
-- =========================================================
USE controlefrota;

CREATE TABLE IF NOT EXISTS trips (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  driver_id      INT UNSIGNED NOT NULL,
  truck_id       INT UNSIGNED,
  trailer_id     INT UNSIGNED,
  origin         VARCHAR(150) NOT NULL,
  destination    VARCHAR(150) NOT NULL,
  cargo          VARCHAR(150),
  client         VARCHAR(150),
  initial_km     DECIMAL(10,1) NOT NULL,
  final_km       DECIMAL(10,1),
  start_date     DATE NOT NULL,
  end_date       DATE,
  freight_value  DECIMAL(10,2) NOT NULL DEFAULT 0,
  freight_status ENUM('a_receber','pago','sem_frete') NOT NULL DEFAULT 'sem_frete',
  receivable_id  INT UNSIGNED NULL,
  obs            TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id)  REFERENCES drivers(id)  ON DELETE CASCADE,
  FOREIGN KEY (truck_id)   REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (trailer_id) REFERENCES vehicles(id) ON DELETE SET NULL
);
