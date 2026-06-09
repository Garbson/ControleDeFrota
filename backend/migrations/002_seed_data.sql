-- =========================================================
-- ControleDeFrota — Seed de dados (migração dos dados demo)
-- =========================================================
USE controlefrota;

-- -------------------------------------------------------
-- FORNECEDORES
-- -------------------------------------------------------
INSERT INTO suppliers (name) VALUES
('THERMO RIO BRANCO EIRELI ME'),
('PILOTO AUTOMOTIVA E REFRIGERAÇÃO LTDA'),
('ROVEMA VEICULOS E MAQUINAS LTDA'),
('L. F. OLIVEIRA AR CONDICIONADO EIRELI'),
('AUTO PEÇAS VITÓRIA LTDA'),
('DISTRIBUIDORA DIESEL LTDA'),
('PNEU CENTER BRASIL LTDA'),
('POSTO LUBRIFICAÇÃO RÁPIDA'),
('DETRAN'),
('OFICINA DO CAMINHONEIRO LTDA'),
('SUPERCARGO PNEUS LTDA'),
('CONTINENTAL PNEUS LTDA'),
('DPLUS PNEUS LTDA');

-- -------------------------------------------------------
-- VEÍCULOS (Cavalos — trucks)
-- -------------------------------------------------------
INSERT INTO vehicles (plate, type, brand, model) VALUES
('QWN3F25', 'truck', 'Scania', 'R450'),
('TAA8A32', 'truck', 'Volvo', 'FH540'),
('SQS4F03', 'truck', 'Mercedes', 'Actros 2651'),
('QWN3A53', 'truck', 'Scania', 'R480'),
('QWN3A33', 'truck', 'Scania', 'R450'),
('SHA6C63', 'truck', 'Volvo', 'FH540'),
('SHA9C52', 'truck', 'Mercedes', 'Actros 2646'),
('QWP1I64', 'truck', 'Scania', 'R500'),
('QWO2F67', 'truck', 'Volvo', 'FH520'),
('DAF7',    'truck', 'DAF', 'XF480'),
('QW02F67', 'truck', 'Scania', 'R450'),
('SHA7J93', 'truck', 'Mercedes', 'Actros 2651');

-- -------------------------------------------------------
-- VEÍCULOS (Carretas / Reboques — trailers)
-- -------------------------------------------------------
INSERT INTO vehicles (plate, type, brand, model) VALUES
('NAD9G16',   'trailer', 'Randon', '9 Eixos'),
('SQT2A01',   'trailer', 'Randon', 'Carreta'),
('SHA7J53',   'trailer', 'Guerra', 'Frigorifica'),
('QLV0365',   'trailer', 'Randon', 'Carreta'),
('QWO4F44',   'trailer', 'Randon', 'Carreta'),
('NXS1J94',   'trailer', 'Guerra', 'Frigorifica'),
('SHA4J48',   'trailer', 'Randon', 'Caçamba'),
('QWP4G94',   'trailer', 'Randon', 'Carreta'),
('VANDERLEIA', 'trailer', 'Randon', 'Carreta'),
('QWM0E36',   'trailer', 'Randon', 'Carreta');

-- -------------------------------------------------------
-- MOTORISTAS
-- -------------------------------------------------------
INSERT INTO drivers (name, color, active) VALUES
('ANTONIO',          '#2563eb', 1),   -- 1
('BEBE',             '#7c3aed', 1),   -- 2
('DANIEL',           '#059669', 1),   -- 3
('ELIZEU',           '#d97706', 1),   -- 4
('FLAVIO',           '#dc2626', 1),   -- 5
('GENILSON',         '#0891b2', 1),   -- 6
('SEBASTIÃO',        '#7c3aed', 1),   -- 7
('MATHEUS',          '#f59e0b', 1),   -- 8
('ROMARIO',          '#10b981', 1),   -- 9
('VALDIR',           '#6366f1', 1),   -- 10
('LEILSON (Coca Cola)', '#ec4899', 1), -- 11
('JOSÉ CHAVES',      '#f97316', 1),   -- 12
('ADRIANO',          '#14b8a6', 1);   -- 13

-- -------------------------------------------------------
-- VINCULAÇÃO MOTORISTA ↔ VEÍCULO
-- Truck IDs: QWN3F25=1, TAA8A32=2, SQS4F03=3, QWN3A53=4, QWN3A33=5,
--            SHA6C63=6, SHA9C52=7, QWP1I64=8, QWO2F67=9, DAF7=10, QW02F67=11, SHA7J93=12
-- Trailer IDs: NAD9G16=13, SQT2A01=14, SHA7J53=15, QLV0365=16, QWO4F44=17,
--              NXS1J94=18, SHA4J48=19, QWP4G94=20, VANDERLEIA=21, QWM0E36=22
-- -------------------------------------------------------
INSERT INTO driver_vehicles (driver_id, truck_id, trailer_id, trailer_type, since) VALUES
(1,  1,  13, '9 Eixos',     '2025-01-01'),  -- ANTONIO
(2,  2,  14, 'Carreta',     '2025-01-01'),  -- BEBE
(3,  3,  15, 'Frigorífica', '2025-01-01'),  -- DANIEL
(4,  4,  16, 'Carreta',     '2025-01-01'),  -- ELIZEU
(5,  5,  17, 'Carreta',     '2025-01-01'),  -- FLAVIO
(6,  6,  18, 'Frigorífica', '2025-01-01'),  -- GENILSON
(7,  7,  NULL,'Cavalo DAF', '2025-01-01'),  -- SEBASTIÃO
(8,  8,  19, 'Caçamba',     '2025-01-01'),  -- MATHEUS
(9,  9,  NULL,'Cavalo DAF', '2025-01-01'),  -- ROMARIO
(10, NULL,20, 'Carreta',    '2025-01-01'),  -- VALDIR
(11, 10, 21, 'Carreta',     '2025-01-01'),  -- LEILSON
(12, 11, 22, 'Carreta',     '2025-01-01'),  -- JOSÉ CHAVES
(13, 12, NULL,'Cavalo DAF', '2025-01-01');  -- ADRIANO

-- -------------------------------------------------------
-- ESTOQUE DE PNEUS
-- -------------------------------------------------------
INSERT INTO stock_items (description, brand, nf_number, status, qty, unit_price, entry_date) VALUES
('Supercargo Liso 275/80',      'Supercargo',  '2267', 'novo',    18, 1250.00, '2026-03-15'),
('Continental Borrachudo 295/80','Continental', '2103', 'novo',    12, 1380.00, '2026-02-20'),
('Dplus Borrachudo 275/80',      'Dplus',       '2310', 'novo',    15, 1180.00, '2026-04-10'),
('Continental Liso 295/80',      'Continental', '2103', 'novo',     8, 1350.00, '2026-02-20'),
('Supercargo Recapado 275/80',   'Supercargo',  '2267', 'recapado',10,  580.00, '2026-03-15'),
('Continental Recapado 295/80',  'Continental', '2103', 'recapado', 7,  620.00, '2026-02-20');

-- -------------------------------------------------------
-- HISTÓRICO DE PNEUS (tire_assignments)
-- Mapeando motoristas e veículos por posição de INSERT:
-- ANTONIO=1, BEBE=2, DANIEL=3, ELIZEU=4, FLAVIO=5, GENILSON=6,
-- SEBASTIÃO=7, MATHEUS=8, ROMARIO=9, VALDIR=10, LEILSON=11, CHAVES=12, ADRIANO=13
-- Veículo trucks: QWN3F25=1,TAA8A32=2,SQS4F03=3,QWN3A53=4,QWN3A33=5,SHA6C63=6,SHA9C52=7,QWP1I64=8,QWO2F67=9,DAF7=10,QW02F67=11,SHA7J93=12
-- stock_items: Sup.Liso=1,Cont.Borr=2,Dplus.Borr=3,Cont.Liso=4,Sup.Rec=5,Cont.Rec=6
-- -------------------------------------------------------
-- ANTONIO (8 pneus)
INSERT INTO tire_assignments (driver_id, vehicle_id, brand, qty, type, stock_item_id, assigned_at) VALUES
(1, 1, 'Supercargo Liso', 4, 'novo', 1, '2026-04-10'),
(1, 1, 'Supercargo Liso', 4, 'novo', 1, '2026-05-08');

-- BEBE (17 pneus)
INSERT INTO tire_assignments (driver_id, vehicle_id, brand, qty, type, stock_item_id, assigned_at) VALUES
(2, 2, 'Continental Borrachudo', 4, 'novo',    2, '2026-04-15'),
(2, 2, 'Dplus Borrachudo',       4, 'novo',    3, '2026-05-02'),
(2, 2, 'Supercargo Liso',        4, 'novo',    1, '2026-05-18'),
(2, 2, 'Supercargo Recapado',    5, 'recapado',5, '2026-05-28');

-- DANIEL (19 pneus)
INSERT INTO tire_assignments (driver_id, vehicle_id, brand, qty, type, stock_item_id, assigned_at) VALUES
(3, 3, 'Supercargo Liso',   4, 'novo', 1, '2026-04-08'),
(3, 3, 'Continental Liso',  4, 'novo', 4, '2026-04-22'),
(3, 3, 'Dplus Borrachudo',  4, 'novo', 3, '2026-05-05'),
(3, 3, 'Supercargo Liso',   4, 'novo', 1, '2026-05-20'),
(3, 3, 'Continental Liso',  3, 'novo', 4, '2026-06-01');

-- ELIZEU (14 pneus)
INSERT INTO tire_assignments (driver_id, vehicle_id, brand, qty, type, stock_item_id, assigned_at) VALUES
(4, 4, 'Continental Recapado',   4, 'recapado', 6, '2026-04-12'),
(4, 4, 'Supercargo Liso',        4, 'novo',     1, '2026-04-28'),
(4, 4, 'Continental Borrachudo', 4, 'novo',     2, '2026-05-15'),
(4, 4, 'Dplus Borrachudo',       2, 'novo',     3, '2026-05-25');

-- FLAVIO (13 pneus)
INSERT INTO tire_assignments (driver_id, vehicle_id, brand, qty, type, stock_item_id, assigned_at) VALUES
(5, 5, 'Dplus Borrachudo',  4, 'novo', 3, '2026-04-18'),
(5, 5, 'Supercargo Liso',   4, 'novo', 1, '2026-05-08'),
(5, 5, 'Continental Liso',  3, 'novo', 4, '2026-05-22'),
(5, 5, 'Supercargo Liso',   2, 'novo', 1, '2026-06-03');

-- GENILSON (12 pneus)
INSERT INTO tire_assignments (driver_id, vehicle_id, brand, qty, type, stock_item_id, assigned_at) VALUES
(6, 6, 'Continental Borrachudo', 4, 'novo', 2, '2026-04-20'),
(6, 6, 'Supercargo Liso',        4, 'novo', 1, '2026-05-10'),
(6, 6, 'Dplus Borrachudo',       4, 'novo', 3, '2026-05-28');

-- SEBASTIÃO (10 pneus)
INSERT INTO tire_assignments (driver_id, vehicle_id, brand, qty, type, stock_item_id, assigned_at) VALUES
(7, 7, 'Continental Borrachudo', 4, 'novo', 2, '2026-04-25'),
(7, 7, 'Dplus Borrachudo',       4, 'novo', 3, '2026-05-12'),
(7, 7, 'Supercargo Liso',        2, 'novo', 1, '2026-05-30');

-- MATHEUS (24 pneus)
INSERT INTO tire_assignments (driver_id, vehicle_id, brand, qty, type, stock_item_id, assigned_at) VALUES
(8, 8, 'Supercargo Liso',        4, 'novo', 1, '2026-04-05'),
(8, 8, 'Continental Borrachudo', 4, 'novo', 2, '2026-04-20'),
(8, 8, 'Dplus Borrachudo',       4, 'novo', 3, '2026-04-30'),
(8, 8, 'Supercargo Liso',        4, 'novo', 1, '2026-05-12'),
(8, 8, 'Supercargo Liso',        4, 'novo', 1, '2026-05-24'),
(8, 8, 'Continental Liso',       4, 'novo', 4, '2026-06-05');

-- ROMARIO (13 pneus)
INSERT INTO tire_assignments (driver_id, vehicle_id, brand, qty, type, stock_item_id, assigned_at) VALUES
(9, 9, 'Continental Liso',  4, 'novo', 4, '2026-04-15'),
(9, 9, 'Dplus Borrachudo',  4, 'novo', 3, '2026-05-05'),
(9, 9, 'Supercargo Liso',   3, 'novo', 1, '2026-05-20'),
(9, 9, 'Continental Liso',  2, 'novo', 4, '2026-06-02');

-- VALDIR (4 pneus)
INSERT INTO tire_assignments (driver_id, vehicle_id, brand, qty, type, stock_item_id, assigned_at) VALUES
(10, NULL, 'Supercargo Liso', 4, 'novo', 1, '2026-05-10');

-- LEILSON (5 pneus)
INSERT INTO tire_assignments (driver_id, vehicle_id, brand, qty, type, stock_item_id, assigned_at) VALUES
(11, 10, 'Continental Borrachudo', 4, 'novo', 2, '2026-05-08'),
(11, 10, 'Supercargo Liso',        1, 'novo', 1, '2026-05-20');

-- JOSÉ CHAVES (8 pneus)
INSERT INTO tire_assignments (driver_id, vehicle_id, brand, qty, type, stock_item_id, assigned_at) VALUES
(12, 11, 'Dplus Borrachudo', 4, 'novo', 3, '2026-04-12'),
(12, 11, 'Supercargo Liso',  4, 'novo', 1, '2026-04-28');

-- ADRIANO (6 pneus)
INSERT INTO tire_assignments (driver_id, vehicle_id, brand, qty, type, stock_item_id, assigned_at) VALUES
(13, 12, 'Continental Liso',  4, 'novo', 4, '2026-04-22'),
(13, 12, 'Supercargo Liso',   2, 'novo', 1, '2026-05-10');

-- -------------------------------------------------------
-- MOVIMENTAÇÕES DE ESTOQUE (entradas e saídas)
-- -------------------------------------------------------
INSERT INTO movements (type, driver_id, vehicle_id, stock_item_id, qty, unit_value, total_value, mov_date) VALUES
-- Entradas (NF chegadas)
('entrada', NULL, NULL, 1, 40, 1250.00, 50000.00, '2026-03-15'),
('entrada', NULL, NULL, 2, 20, 1380.00, 27600.00, '2026-02-20'),
('entrada', NULL, NULL, 3, 25, 1180.00, 29500.00, '2026-04-10'),
-- Saídas (distribuições)
('saida', 8, 8,  1, 4, 1250.00, 5000.00, '2026-04-05'),
('saida', 8, 8,  2, 4, 1380.00, 5520.00, '2026-04-20'),
('saida', 3, 3,  1, 4, 1250.00, 5000.00, '2026-04-08'),
('saida', 2, 2,  2, 4, 1380.00, 5520.00, '2026-04-15'),
('saida', 4, 4,  6, 4,  620.00, 2480.00, '2026-04-12'),
('saida', 8, 8,  3, 4, 1180.00, 4720.00, '2026-04-30'),
('saida', 8, 8,  1, 4, 1250.00, 5000.00, '2026-05-12'),
('saida', 3, 3,  4, 4, 1350.00, 5400.00, '2026-05-20'),
('saida', 8, 8,  1, 4, 1250.00, 5000.00, '2026-05-24');

-- -------------------------------------------------------
-- CONTAS A PAGAR
-- -------------------------------------------------------
INSERT INTO accounts_payable (document, description, driver_id, category, value, issue_date, due_date, status) VALUES
('NF 4009 / NFS 69', 'KIT COXIM / KIT CORREIA / KIT FILTRO / MANUTENÇÃO PREVENTIVA', 7, 'manutencao', 1341.22, '2026-03-06', '2026-05-16', 'pendente'),
('NF 250 / NF 5383', 'REPARO THERMOKING / PARAFUSO DE FIXAÇÃO',                        7, 'manutencao', 1000.00, '2026-04-23', '2026-05-17', 'pago'),
('NF 27182 / 27181', 'ABRAÇADEIRA P/ MANGUEIRA E MANGUEIRA ARREFECIMENTO',             5, 'manutencao',  389.50, '2026-04-23', '2026-05-17', 'pendente'),
('OS 45460',         'MÃO DE OBRA AR CONDICIONADO + GÁS',                              3, 'manutencao',  693.33, '2026-04-23', '2026-05-18', 'pago'),
('NF 95428',         'MOLDURA DO FAROL LADO ESQUERDO E DIREITO',                       3, 'pecas',       523.94, '2026-04-23', '2026-05-18', 'pendente'),
('NF 8821',          'KIT EMBREAGEM COMPLETO',                                         2, 'pecas',      2100.00, '2026-04-25', '2026-05-20', 'pendente'),
('NF 9901',          'ALINHAMENTO + BALANCEAMENTO 12 PNEUS',                           4, 'pneus',       450.00, '2026-04-28', '2026-05-22', 'pago'),
('NF 10023',         '2 PNEUS SUPER CARGO LISO 275/80',                                7, 'pneus',       870.00, '2026-04-30', '2026-05-25', 'pendente'),
('NF 4567',          'SENSOR ABS + CABO FREIO',                                        9, 'pecas',       345.80, '2026-05-02', '2026-05-28', 'pendente'),
('OS 46200',         'REVISÃO COMPLETA SUSPENSÃO DIANTEIRA',                           6, 'manutencao', 1850.00, '2026-05-05', '2026-05-30', 'pendente'),
('NF 7721',          'BOMBA D''ÁGUA + CORREIA DENTADA',                                1, 'pecas',       625.00, '2026-05-08', '2026-06-01', 'pendente'),
('NF 3340',          'TROCA DE ÓLEO + FILTROS',                                        8, 'pneus',       320.00, '2026-05-10', '2026-06-03', 'pago'),
('NF 4512',          'TAXA DE LICENCIAMENTO ANUAL',                                    NULL,'administrativo',1200.00,'2026-05-12','2026-06-05','pendente'),
('NF 5601',          '2 PNEUS RECAPADOS',                                              12, 'pneus',      750.00, '2026-05-15', '2026-06-08', 'pendente'),
('OS 47001',         'REPARO CAIXA DE CÂMBIO',                                         11, 'manutencao', 1580.00, '2026-05-18', '2026-06-10', 'pendente'),
('NF 2210',          'PASTILHAS DE FREIO DIANTEIRAS',                                  7, 'manutencao',  430.00, '2026-05-20', '2026-06-12', 'pago'),
('NF 8810',          'ALTERNADOR REMANUFATURADO',                                      3, 'pecas',       615.00, '2026-05-22', '2026-06-15', 'pendente');

-- -------------------------------------------------------
-- CONTAS A RECEBER
-- -------------------------------------------------------
INSERT INTO accounts_receivable (description, client, driver_id, type, value, issue_date, due_date, status) VALUES
('Carga Frigorificada — 28 ton — SP/BA', 'FRIGORÍFICO BOI BRANCO LTDA',  6, 'frete', 8500.00, '2026-05-05', '2026-05-15', 'recebido'),
('Carga Seca — 32 ton — RJ/BH',          'DISTRIBUIDORA ATACADÃO',        4, 'frete', 4200.00, '2026-05-08', '2026-05-20', 'recebido'),
('Bebidas — 24 ton — Manaus/Porto Velho', 'COCA COLA FEMSA',              11, 'frete', 5200.00, '2026-05-10', '2026-05-25', 'pendente'),
('Grãos — 35 ton — Sorriso/Paranaguá',   'AGRÍCOLA SOJA BRASIL',          8, 'frete', 6200.00, '2026-05-12', '2026-05-28', 'pendente'),
('Madeira — 30 ton — Porto Velho/SP',    'MADEIREIRA AMAZÔNIA',            2, 'frete', 7800.00, '2026-05-15', '2026-05-30', 'pendente'),
('Carga Geral — 26 ton — CWB/FLN',       'TRANSPORTADORA RÁPIDA',          5, 'frete', 1800.00, '2026-05-18', '2026-06-02', 'recebido'),
('Carga Frigorificada — 27 ton — CGR/BSB','FRIGORÍFICO BOI BRANCO LTDA',   3, 'frete', 5600.00, '2026-05-20', '2026-06-05', 'pendente'),
('Produtos Químicos — 22 ton — CUB/CTG', 'INDÚSTRIA QUÍMICA ABC',          1, 'frete', 3500.00, '2026-05-22', '2026-06-08', 'pendente');

-- -------------------------------------------------------
-- REGISTROS DE COMBUSTÍVEL
-- -------------------------------------------------------
INSERT INTO fuel_records (driver_id, vehicle_id, liters, price_liter, total, station, fuel_date) VALUES
(8,  8,  280, 5.890, 1649.20, 'Posto Ipiranga — BR 364',   '2026-05-24'),
(3,  3,  310, 5.790, 1794.90, 'Posto Ale — BR 101',         '2026-05-22'),
(2,  2,  260, 5.890, 1531.40, 'Posto Shell — BR 116',       '2026-05-20'),
(4,  4,  295, 5.850, 1725.75, 'Posto Ipiranga — BR 364',   '2026-05-18'),
(5,  5,  250, 5.920, 1480.00, 'Posto Petrobras — BR 050',  '2026-05-16'),
(7,  7,  240, 5.890, 1413.60, 'Posto Ipiranga — BR 364',   '2026-05-14'),
(6,  6,  275, 5.790, 1592.25, 'Posto Ale — BR 101',         '2026-05-12'),
(9,  9,  230, 5.950, 1368.50, 'Posto Shell — BR 116',       '2026-05-10'),
(8,  8,  300, 5.850, 1755.00, 'Posto Ipiranga — BR 364',   '2026-05-08'),
(1,  1,  220, 5.920, 1302.40, 'Posto Petrobras — BR 050',  '2026-05-05');
