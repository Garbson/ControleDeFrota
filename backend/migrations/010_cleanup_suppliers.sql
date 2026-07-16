-- =========================================================
-- ControleDeFrota — Remove fornecedores do seed não utilizados
-- =========================================================
-- ATENÇÃO: Execute este script primeiro para ver quais fornecedores
-- estão em uso antes de deletar. Rode linha por linha.
-- =========================================================
USE controlefrota;

-- 1. Liste os fornecedores com contagem de uso
SELECT
  s.id,
  s.name,
  s.cnpj,
  COUNT(ap.id) AS contas_pagar,
  COUNT(p.id)  AS compras,
  COUNT(si.id) AS itens_estoque
FROM suppliers s
LEFT JOIN accounts_payable ap ON ap.supplier_id = s.id
LEFT JOIN purchases p         ON p.supplier_id = s.id
LEFT JOIN stock_items si      ON si.supplier_id = s.id
GROUP BY s.id, s.name, s.cnpj
ORDER BY s.id;

-- 2. Remova APENAS os fornecedores do seed (IDs 1 a 13)
--    que NÃO estão em uso em nenhuma tabela.
--    ⚠️  Confira a lista acima antes de rodar este DELETE!

-- DELETE FROM suppliers
-- WHERE id BETWEEN 1 AND 13
--   AND id NOT IN (
--     SELECT DISTINCT supplier_id FROM accounts_payable WHERE supplier_id IS NOT NULL
--     UNION
--     SELECT DISTINCT supplier_id FROM purchases WHERE supplier_id IS NOT NULL
--     UNION
--     SELECT DISTINCT supplier_id FROM stock_items WHERE supplier_id IS NOT NULL
--   );
