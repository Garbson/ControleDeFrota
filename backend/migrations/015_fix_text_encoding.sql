USE controlefrota;

-- Corrige registros antigos que foram gravados como UTF-8 interpretado como Latin-1.
-- Os filtros usam o valor corrompido para não sobrescrever dados já corrigidos/editados.

UPDATE drivers SET name = 'SEBASTIÃO'
WHERE id = 7 AND BINARY name = BINARY 'SEBASTIÃƒO';

UPDATE drivers SET name = 'JOSÉ CHAVES'
WHERE id = 12 AND BINARY name = BINARY 'JOSÃ‰ CHAVES';

UPDATE accounts_payable SET description = 'NF 1785 SERVIÇO DE ALINHAMENTO SHA9C52'
WHERE id = 104 AND BINARY description = BINARY 'NF 1785 SERVIÃ‡O DE ALINHAMENTO SHA9C52';

UPDATE accounts_payable SET supplier_name_free = 'NORTE COM PEÇAS E ACESS'
WHERE id = 108 AND BINARY supplier_name_free = BINARY 'NORTE COM PEÃ‡AS E ACESS';

UPDATE accounts_payable SET description = 'NF 6872 E NFS-e 762 PINO CENTRO/MOLA MESTRE SERVIÇO MOLEJO QLV0365'
WHERE id = 109 AND BINARY description = BINARY 'NF 6872 E NFS-e 762 PINO CENTRO/MOLA MESTRE SERVIÃ‡O MOLEJO QLV0365';

UPDATE accounts_payable
SET description = 'RPS 200001836 SERVIÇO DIAGNOSTICO COMPUTADORIZADO E CORREÇÃO FALHAS (1/2)',
    supplier_name_free = 'SOARES SERVIÇOS MECÂNICOS'
WHERE id = 115;

UPDATE accounts_payable
SET description = 'RPS 200001836 SERVIÇO DIAGNOSTICO COMPUTADORIZADO E CORREÇÃO FALHAS (2/2)',
    supplier_name_free = 'SOARES SERVIÇOS MECÂNICOS'
WHERE id = 116;

UPDATE accounts_payable SET description = 'VULCANIZAÇÃO-BEBE'
WHERE id = 125 AND BINARY description = BINARY 'VULCANIZAÃ‡ÃƒO-BEBE';

UPDATE accounts_payable SET description = 'PRÓ FROTAS CICLO 16-30 JUNHO'
WHERE id = 144 AND BINARY description = BINARY 'PRÃ“ FROTAS CICLO 16-30 JUNHO';

UPDATE accounts_receivable
SET description = 'Carga Frigorificada — 28 ton — SP/BA', client = 'FRIGORÍFICO BOI BRANCO LTDA'
WHERE id = 1;

UPDATE accounts_receivable
SET description = 'Carga Seca — 32 ton — RJ/BH', client = 'DISTRIBUIDORA ATACADÃO'
WHERE id = 2;

UPDATE accounts_receivable
SET description = 'Bebidas — 24 ton — Manaus/Porto Velho'
WHERE id = 3;

UPDATE accounts_receivable
SET description = 'Grãos — 35 ton — Sorriso/Paranaguá', client = 'AGRÍCOLA SOJA BRASIL'
WHERE id = 4;

UPDATE accounts_receivable
SET description = 'Madeira — 30 ton — Porto Velho/SP', client = 'MADEIREIRA AMAZÔNIA'
WHERE id = 5;

UPDATE accounts_receivable
SET description = 'Carga Geral — 26 ton — CWB/FLN', client = 'TRANSPORTADORA RÁPIDA'
WHERE id = 6;

UPDATE accounts_receivable
SET description = 'Carga Frigorificada — 27 ton — CGR/BSB', client = 'FRIGORÍFICO BOI BRANCO LTDA'
WHERE id = 7;

UPDATE accounts_receivable
SET description = 'Produtos Químicos — 22 ton — CUB/CTG', client = 'INDÚSTRIA QUÍMICA ABC'
WHERE id = 8;

UPDATE accounts_receivable SET description = 'Frete: RBR → São Paulo (madeira)'
WHERE id = 10 AND BINARY description = BINARY 'Frete: RBR â†’ SÃ£o Paulo (madeira)';

UPDATE accounts_receivable SET description = 'Frete: Rio Branco → São Paulo (teste)'
WHERE id = 26 AND BINARY description = BINARY 'Frete: Rio Branco â†’ SÃ£o Paulo (teste)';
