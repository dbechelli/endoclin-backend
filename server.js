const express = require('express')
const { Pool } = require('pg')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

// Importar módulo de autenticação
const auth = require('./auth')

// Carregar variáveis do .env apenas se existir (desenvolvimento local)
if (fs.existsSync('.env')) {
  require('dotenv').config({ path: '.env' })
}

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// Health checks (sem autenticação)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend operacional' })
})

app.get('/health', async (req, res) => {
  res.json({ status: 'healthy' })
})

// Endpoints públicos
app.post('/auth/login', (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password são obrigatórios' })
    }
    
    const result = auth.login(username, password)
    if (!result.success) {
      return res.status(401).json({ error: result.error })
    }    
    res.json({ message: 'Login com sucesso' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/auth/logout', (req, res) => {
  res.json({ message: 'Logout OK' })
})

// Inicializar Pool PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
})

pool.on('error', (err) => {
  console.error('❌ Erro na conexão com PostgreSQL:', err)
})

// ============ MIDDLEWARE DE AUTENTICAÇÃO ============
app.use('/api', auth.verifyToken)

// ============ ROTAS DE PROFISSIONAIS ============

// GET /api/profissionais - Listar profissionais
app.get('/api/profissionais', async (req, res) => {
  try {
    let query = 'SELECT * FROM profissionais WHERE 1=1'
    const params = []
    let paramIndex = 1

    // Filtros
    if (req.query['filter[ativo]'] !== undefined) {
      query += ` AND ativo = $${paramIndex}`
      params.push(req.query['filter[ativo]'] === 'true')
      paramIndex++
    }

    // Ordenação
    if (req.query.orderBy) {
      const ascending = req.query.ascending !== 'false'
      query += ` ORDER BY ${req.query.orderBy} ${ascending ? 'ASC' : 'DESC'}`
    }

    // Limite
    if (req.query.limit) {
      query += ` LIMIT $${paramIndex}`
      params.push(parseInt(req.query.limit))
    }

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar profissionais:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/profissionais - Criar profissional
app.post('/api/profissionais', async (req, res) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body]
    const insertedRecords = []

    for (const record of records) {
      const {
        nome_completo,
        nome_exibicao,
        especialidade,
        crm_registro,
        email,
        telefone,
        ativo,
        config_atendimento
      } = record

      const query = `
        INSERT INTO profissionais 
        (nome_completo, nome_exibicao, especialidade, crm_registro, email, telefone, ativo, config_atendimento)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `

      const result = await pool.query(query, [
        nome_completo,
        nome_exibicao,
        especialidade,
        crm_registro,
        email,
        telefone,
        ativo ?? true,
        config_atendimento ? JSON.stringify(config_atendimento) : null
      ])

      insertedRecords.push(result.rows[0])
    }

    res.status(201).json(insertedRecords)
  } catch (error) {
    console.error('Erro ao criar profissional:', error)
    res.status(500).json({ error: error.message })
  }
})

// PATCH /api/profissionais - Atualizar profissional
app.patch('/api/profissionais', async (req, res) => {
  try {
    const filterId = req.query['filter[id]']
    
    if (!filterId) {
      return res.status(400).json({ error: 'ID é obrigatório para atualização' })
    }

    const {
      nome_completo,
      nome_exibicao,
      especialidade,
      crm_registro,
      email,
      telefone,
      ativo,
      config_atendimento
    } = req.body

    const updates = []
    const params = []
    let paramIndex = 1

    if (nome_completo !== undefined) {
      updates.push(`nome_completo = $${paramIndex++}`)
      params.push(nome_completo)
    }
    if (nome_exibicao !== undefined) {
      updates.push(`nome_exibicao = $${paramIndex++}`)
      params.push(nome_exibicao)
    }
    if (especialidade !== undefined) {
      updates.push(`especialidade = $${paramIndex++}`)
      params.push(especialidade)
    }
    if (crm_registro !== undefined) {
      updates.push(`crm_registro = $${paramIndex++}`)
      params.push(crm_registro)
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`)
      params.push(email)
    }
    if (telefone !== undefined) {
      updates.push(`telefone = $${paramIndex++}`)
      params.push(telefone)
    }
    if (ativo !== undefined) {
      updates.push(`ativo = $${paramIndex++}`)
      params.push(ativo)
    }
    if (config_atendimento !== undefined) {
      updates.push(`config_atendimento = $${paramIndex++}`)
      params.push(config_atendimento ? JSON.stringify(config_atendimento) : null)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    params.push(filterId)
    const query = `
      UPDATE profissionais 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Erro ao atualizar profissional:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/profissionais - Deletar profissional
app.delete('/api/profissionais', async (req, res) => {
  try {
    const filterId = req.query['filter[id]']
    
    if (!filterId) {
      return res.status(400).json({ error: 'ID é obrigatório para deleção' })
    }

    const query = 'DELETE FROM profissionais WHERE id = $1 RETURNING *'
    const result = await pool.query(query, [filterId])

    res.json(result.rows)
  } catch (error) {
    console.error('Erro ao deletar profissional:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============ ROTAS DE AGENDAMENTOS ============

// GET /api/agendamentos - Listar agendamentos
app.get('/api/agendamentos', async (req, res) => {
  try {
    let query = 'SELECT * FROM agendamentos WHERE 1=1'
    const params = []
    let paramIndex = 1

    // Filtros
    if (req.query['filter[profissional]']) {
      query += ` AND profissional = $${paramIndex}`
      params.push(req.query['filter[profissional]'])
      paramIndex++
    }

    if (req.query['filter[status]']) {
      query += ` AND status = $${paramIndex}`
      params.push(req.query['filter[status]'])
      paramIndex++
    }

    // Ordenação
    if (req.query.orderBy) {
      const ascending = req.query.ascending !== 'false'
      query += ` ORDER BY ${req.query.orderBy} ${ascending ? 'ASC' : 'DESC'}`
    }

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/agendamentos - Criar agendamento
app.post('/api/agendamentos', async (req, res) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body]
    const insertedRecords = []

    for (const record of records) {
      const query = `
        INSERT INTO agendamentos 
        (nome_paciente, profissional, data_consulta, hora_consulta, tipo_consulta, status, observacoes, primeira_consulta)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `

      const result = await pool.query(query, [
        record.nome_paciente,
        record.profissional,
        record.data_consulta,
        record.hora_consulta,
        record.tipo_consulta,
        record.status || 'pendente',
        record.observacoes,
        record.primeira_consulta || false
      ])

      insertedRecords.push(result.rows[0])
    }

    res.status(201).json(insertedRecords)
  } catch (error) {
    console.error('Erro ao criar agendamento:', error)
    res.status(500).json({ error: error.message })
  }
})

// PATCH /api/agendamentos - Atualizar agendamento
app.patch('/api/agendamentos', async (req, res) => {
  try {
    const filterId = req.query['filter[id]']
    
    if (!filterId) {
      return res.status(400).json({ error: 'ID é obrigatório para atualização' })
    }

    const {
      nome_paciente,
      profissional,
      data_consulta,
      hora_consulta,
      tipo_consulta,
      status,
      observacoes,
      primeira_consulta
    } = req.body

    const updates = []
    const params = []
    let paramIndex = 1

    if (nome_paciente !== undefined) {
      updates.push(`nome_paciente = $${paramIndex++}`)
      params.push(nome_paciente)
    }
    if (profissional !== undefined) {
      updates.push(`profissional = $${paramIndex++}`)
      params.push(profissional)
    }
    if (data_consulta !== undefined) {
      updates.push(`data_consulta = $${paramIndex++}`)
      params.push(data_consulta)
    }
    if (hora_consulta !== undefined) {
      updates.push(`hora_consulta = $${paramIndex++}`)
      params.push(hora_consulta)
    }
    if (tipo_consulta !== undefined) {
      updates.push(`tipo_consulta = $${paramIndex++}`)
      params.push(tipo_consulta)
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      params.push(status)
    }
    if (observacoes !== undefined) {
      updates.push(`observacoes = $${paramIndex++}`)
      params.push(observacoes)
    }
    if (primeira_consulta !== undefined) {
      updates.push(`primeira_consulta = $${paramIndex++}`)
      params.push(primeira_consulta)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    params.push(filterId)
    const query = `
      UPDATE agendamentos 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/agendamentos - Deletar agendamento
app.delete('/api/agendamentos', async (req, res) => {
  try {
    const filterId = req.query['filter[id]']
    
    if (!filterId) {
      return res.status(400).json({ error: 'ID é obrigatório para deleção' })
    }

    const query = 'DELETE FROM agendamentos WHERE id = $1 RETURNING *'
    const result = await pool.query(query, [filterId])

    res.json(result.rows)
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error)
    res.status(500).json({ error: error.message })
  }
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n✅ Servidor rodando na porta ${PORT}`)
})

process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando...')
  process.exit(0)
})
