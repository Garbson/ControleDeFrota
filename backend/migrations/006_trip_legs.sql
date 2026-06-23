USE controlefrota;

CREATE TABLE IF NOT EXISTS trip_legs (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  trip_id         INT UNSIGNED NOT NULL,
  leg_order       INT NOT NULL DEFAULT 1,
  origin          VARCHAR(255) NOT NULL,
  destination     VARCHAR(255) NOT NULL,
  departure_date  DATE,
  arrival_date    DATE,
  km_start        DECIMAL(10,2),
  km_end          DECIMAL(10,2),
  cargo           VARCHAR(255),
  obs             TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);
