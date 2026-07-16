USE controlefrota;

ALTER TABLE trips
  ADD COLUMN trailer_id_2 INT UNSIGNED NULL AFTER trailer_id,
  ADD CONSTRAINT fk_trips_trailer2 FOREIGN KEY (trailer_id_2) REFERENCES vehicles(id) ON DELETE SET NULL;
