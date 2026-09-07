const { query } = require('../../config/database')

// Definições das tools no formato Anthropic
const toolDefinitions = [
  {
    name: 'listar_veiculos',
    description: 'Lista veículos da frota. Retorna placa, tipo (truck/trailer), marca, modelo, ano e status.',
    input_schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: ['truck', 'trailer'], description: 'Filtra por tipo. Omitir para trazer todos.' },
        somente_ativos: { type: 'boolean', description: 'Se true, só veículos ativos. Padrão: true.' },
      },
    },
  },
  {
    name: 'detalhes_veiculo',
    description: 'Retorna detalhes completos de um veículo pela placa ou id, incluindo histórico de pneus.',
    input_schema: {
      type: 'object',
      properties: {
        placa: { type: 'string', description: 'Placa do veículo (ex: ABC1D23). Prefira este campo.' },
        id: { type: 'integer', description: 'ID interno. Use se souber.' },
      },
    },
  },
  {
    name: 'listar_motoristas',
    description: 'Lista motoristas cadastrados com CNH, categoria, validade e veículo vinculado.',
    input_schema: {
      type: 'object',
      properties: {
        somente_ativos: { type: 'boolean', description: 'Padrão: true.' },
        cnh_vencendo_dias: { type: 'integer', description: 'Filtra motoristas com CNH vencendo nos próximos N dias.' },
      },
    },
  },
  {
    name: 'consumo_combustivel',
    description: 'Consulta registros de abastecimento com filtros. Retorna cada registro e agregações (total litros, total R$, ticket médio, preço médio/litro).',
    input_schema: {
      type: 'object',
      properties: {
        placa: { type: 'string', description: 'Filtra por placa do veículo.' },
        motorista: { type: 'string', description: 'Filtra por nome (parcial) do motorista.' },
        de: { type: 'string', description: 'Data inicial YYYY-MM-DD.' },
        ate: { type: 'string', description: 'Data final YYYY-MM-DD.' },
        limite: { type: 'integer', description: 'Máximo de registros detalhados (padrão 50).' },
      },
    },
  },
  {
    name: 'contas_pagar',
    description: 'Consulta contas a pagar. Útil para ver vencidas, a vencer, pagas, por categoria.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pendente', 'pago', 'vencido', 'cancelado', 'todas'], description: 'Padrão: todas.' },
        vencendo_em_dias: { type: 'integer', description: 'Só as pendentes que vencem nos próximos N dias.' },
        categoria: { type: 'string', enum: ['manutencao', 'pecas', 'pneus', 'combustivel', 'administrativo', 'outros'] },
        de: { type: 'string', description: 'Data inicial (due_date) YYYY-MM-DD.' },
        ate: { type: 'string', description: 'Data final (due_date) YYYY-MM-DD.' },
      },
    },
  },
  {
    name: 'contas_receber',
    description: 'Consulta contas a receber (fretes e outros).',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pendente', 'recebido', 'cancelado', 'todas'] },
        de: { type: 'string' },
        ate: { type: 'string' },
      },
    },
  },
  {
    name: 'resumo_dashboard',
    description: 'Retorna KPIs consolidados da frota (motoristas ativos, estoque de pneus, contas a pagar/receber, combustível do mês, alertas).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'gerar_relatorio',
    description: 'Gera um arquivo PDF ou XLSX a partir de dados tabulares que você já consultou. Use APÓS ter os dados em mãos. Retorna o link de download.',
    input_schema: {
      type: 'object',
      properties: {
        formato: { type: 'string', enum: ['pdf', 'xlsx'], description: 'Formato do arquivo.' },
        titulo: { type: 'string', description: 'Título que aparece no cabeçalho.' },
        colunas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              chave: { type: 'string', description: 'Nome do campo em cada linha.' },
              rotulo: { type: 'string', description: 'Cabeçalho visível.' },
            },
            required: ['chave', 'rotulo'],
          },
          description: 'Colunas da tabela na ordem desejada.',
        },
        linhas: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array de objetos. Cada objeto é uma linha; suas chaves devem bater com "chave" das colunas.',
        },
        resumo: {
          type: 'string',
          description: 'Texto opcional que aparece antes da tabela (parágrafo executivo).',
        },
      },
      required: ['formato', 'titulo', 'colunas', 'linhas'],
    },
  },
]

// Implementação das tools (retornam { ok, data } ou { ok:false, error })
const toolHandlers = {
  async listar_veiculos({ tipo, somente_ativos = true }) {
    let sql = 'SELECT id, plate, type, brand, model, year, color, renavam, active FROM vehicles WHERE 1=1'
    const params = []
    if (somente_ativos) sql += ' AND active = 1'
    if (tipo) { sql += ' AND type = ?'; params.push(tipo) }
    sql += ' ORDER BY plate'
    const rows = await query(sql, params)
    return { total: rows.length, veiculos: rows }
  },

  async detalhes_veiculo({ placa, id }) {
    if (!placa && !id) throw new Error('Informe placa ou id.')
    const [veh] = id
      ? await query('SELECT * FROM vehicles WHERE id = ?', [id])
      : await query('SELECT * FROM vehicles WHERE plate = ?', [String(placa).toUpperCase()])
    if (!veh) return { encontrado: false }

    const pneus = await query(`
      SELECT ta.id, ta.brand, ta.qty, ta.type, ta.assigned_at, ta.obs,
             d.name AS motorista
      FROM tire_assignments ta
      LEFT JOIN drivers d ON d.id = ta.driver_id
      WHERE ta.vehicle_id = ?
      ORDER BY ta.assigned_at DESC
      LIMIT 20
    `, [veh.id])

    const abastecimentos = await query(`
      SELECT fuel_date, liters, price_liter, total, station
      FROM fuel_records
      WHERE vehicle_id = ?
      ORDER BY fuel_date DESC
      LIMIT 10
    `, [veh.id])

    return { encontrado: true, veiculo: veh, ultimos_pneus: pneus, ultimos_abastecimentos: abastecimentos }
  },

  async listar_motoristas({ somente_ativos = true, cnh_vencendo_dias }) {
    let sql = `
      SELECT d.id, d.name, d.cpf, d.cnh, d.cnh_category, d.cnh_expiry, d.phone, d.active,
             t.plate AS caminhao, tr.plate AS carreta
      FROM drivers d
      LEFT JOIN driver_vehicles dv ON dv.driver_id = d.id AND dv.active = 1
      LEFT JOIN vehicles t  ON t.id = dv.truck_id
      LEFT JOIN vehicles tr ON tr.id = dv.trailer_id
      WHERE 1=1
    `
    const params = []
    if (somente_ativos) sql += ' AND d.active = 1'
    if (cnh_vencendo_dias != null) {
      sql += ' AND d.cnh_expiry IS NOT NULL AND d.cnh_expiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)'
      params.push(Number(cnh_vencendo_dias))
    }
    sql += ' ORDER BY d.name'
    const rows = await query(sql, params)
    return { total: rows.length, motoristas: rows }
  },

  async consumo_combustivel({ placa, motorista, de, ate, limite = 50 }) {
    let sql = `
      SELECT fr.fuel_date, fr.liters, fr.price_liter, fr.total, fr.station, fr.fuel_type,
             d.name AS motorista, v.plate AS placa
      FROM fuel_records fr
      LEFT JOIN drivers d ON d.id = fr.driver_id
      LEFT JOIN vehicles v ON v.id = fr.vehicle_id
      WHERE 1=1
    `
    const params = []
    if (placa)     { sql += ' AND v.plate = ?';               params.push(String(placa).toUpperCase()) }
    if (motorista) { sql += ' AND d.name LIKE ?';             params.push(`%${motorista}%`) }
    if (de)        { sql += ' AND fr.fuel_date >= ?';         params.push(de) }
    if (ate)       { sql += ' AND fr.fuel_date <= ?';         params.push(ate) }
    sql += ' ORDER BY fr.fuel_date DESC LIMIT ?'
    params.push(Math.min(Number(limite) || 50, 500))

    const rows = await query(sql, params)
    const totalLitros = rows.reduce((s, r) => s + Number(r.liters || 0), 0)
    const totalValor  = rows.reduce((s, r) => s + Number(r.total  || 0), 0)
    return {
      total_registros: rows.length,
      total_litros: Number(totalLitros.toFixed(2)),
      total_valor: Number(totalValor.toFixed(2)),
      ticket_medio: rows.length ? Number((totalValor / rows.length).toFixed(2)) : 0,
      preco_medio_litro: totalLitros ? Number((totalValor / totalLitros).toFixed(3)) : 0,
      registros: rows,
    }
  },

  async contas_pagar({ status = 'todas', vencendo_em_dias, categoria, de, ate }) {
    let sql = `
      SELECT ap.id, ap.document, ap.description, ap.category, ap.value,
             ap.due_date, ap.paid_date, ap.status,
             s.name AS fornecedor, v.plate AS placa
      FROM accounts_payable ap
      LEFT JOIN suppliers s ON s.id = ap.supplier_id
      LEFT JOIN vehicles v  ON v.id = ap.vehicle_id
      WHERE 1=1
    `
    const params = []
    if (status !== 'todas')  { sql += ' AND ap.status = ?';   params.push(status) }
    if (categoria)           { sql += ' AND ap.category = ?'; params.push(categoria) }
    if (de)                  { sql += ' AND ap.due_date >= ?'; params.push(de) }
    if (ate)                 { sql += ' AND ap.due_date <= ?'; params.push(ate) }
    if (vencendo_em_dias != null) {
      sql += ' AND ap.status = "pendente" AND ap.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)'
      params.push(Number(vencendo_em_dias))
    }
    sql += ' ORDER BY ap.due_date ASC LIMIT 500'
    const rows = await query(sql, params)
    const total = rows.reduce((s, r) => s + Number(r.value || 0), 0)
    return { total_registros: rows.length, total_valor: Number(total.toFixed(2)), contas: rows }
  },

  async contas_receber({ status = 'todas', de, ate }) {
    let sql = `
      SELECT id, document, description, client, type, value,
             due_date, received_date, status
      FROM accounts_receivable
      WHERE 1=1
    `
    const params = []
    if (status !== 'todas') { sql += ' AND status = ?';   params.push(status) }
    if (de)                 { sql += ' AND due_date >= ?'; params.push(de) }
    if (ate)                { sql += ' AND due_date <= ?'; params.push(ate) }
    sql += ' ORDER BY due_date ASC LIMIT 500'
    const rows = await query(sql, params)
    const total = rows.reduce((s, r) => s + Number(r.value || 0), 0)
    return { total_registros: rows.length, total_valor: Number(total.toFixed(2)), contas: rows }
  },

  async resumo_dashboard() {
    const [drivers]     = await query('SELECT COUNT(*) AS total FROM drivers WHERE active = 1')
    const [vehicles]    = await query('SELECT COUNT(*) AS total FROM vehicles WHERE active = 1')
    const [cp]          = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN status='pendente' THEN value ELSE 0 END), 0) AS pendente,
        COALESCE(SUM(CASE WHEN status='pendente' AND due_date < CURDATE() THEN value ELSE 0 END), 0) AS vencido,
        SUM(status='pendente' AND due_date < CURDATE()) AS qtd_vencidos
      FROM accounts_payable
    `)
    const [cr]          = await query(`
      SELECT COALESCE(SUM(CASE WHEN status='pendente' THEN value ELSE 0 END), 0) AS pendente
      FROM accounts_receivable
    `)
    const [fuelMonth]   = await query(`
      SELECT COALESCE(SUM(total), 0) AS total, COALESCE(SUM(liters), 0) AS liters
      FROM fuel_records
      WHERE MONTH(fuel_date) = MONTH(CURDATE()) AND YEAR(fuel_date) = YEAR(CURDATE())
    `)
    return {
      motoristas_ativos: Number(drivers.total),
      veiculos_ativos: Number(vehicles.total),
      contas_pagar_pendente: Number(cp.pendente),
      contas_pagar_vencido: Number(cp.vencido),
      contas_pagar_qtd_vencidas: Number(cp.qtd_vencidos),
      contas_receber_pendente: Number(cr.pendente),
      combustivel_mes_valor: Number(fuelMonth.total),
      combustivel_mes_litros: Number(fuelMonth.liters),
    }
  },

  async gerar_relatorio(input, ctx) {
    const { formato, titulo, colunas, linhas, resumo } = input
    const { criarArquivo } = require('./reports')
    return criarArquivo({ formato, titulo, colunas, linhas, resumo, userId: ctx?.userId })
  },
}

async function executarTool(name, input, ctx) {
  const handler = toolHandlers[name]
  if (!handler) return { ok: false, error: `Tool desconhecida: ${name}` }
  try {
    const data = await handler(input || {}, ctx)
    return { ok: true, data }
  } catch (err) {
    console.error(`[chat/tool:${name}]`, err.message)
    return { ok: false, error: err.message || 'Erro ao executar' }
  }
}

module.exports = { toolDefinitions, executarTool }
