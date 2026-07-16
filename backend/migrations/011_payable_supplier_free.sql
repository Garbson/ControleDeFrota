-- Permite digitar um fornecedor não cadastrado diretamente no campo
ALTER TABLE accounts_payable
  ADD COLUMN supplier_name_free VARCHAR(255) NULL AFTER supplier_id;
