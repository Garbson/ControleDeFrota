USE controlefrota;

UPDATE vehicles SET model = 'Caçamba'
WHERE id = 19 AND BINARY model = BINARY 'CaÃ§amba';
