/**
 * Backend SoftClin Agenda - Express + PostgreSQL
 * API REST para gerenciar profissionais e agendamentos
 * 
 * Instalação de dependências:
 * npm install express pg dotenv cors
 * 
 * Para usar:
 * node server.js
 */

const express = require('express')
const { Pool } = require('pg')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

// Importar módulo de autenticação
const auth = require('./auth')

// Carregar variáveis do .env se existir (desenvolvimento)
require('dotenv').config({ path: '.env' })


const app = express()
const PORT = process.env.PORT || 3000

// Log de inicialização
console.log('🚀 Iniciando servidor...')
console.log('📋 Variáveis de ambiente:')
console.log(`   PORT: ${process.env.PORT || 'não definida (usando 3000)'}`)
console.log(`   DB_HOST: ${process.env.DB_HOST || 'não definida'}`)
console.log(`   DB_PORT: ${process.env.DB_PORT || 'não definida'}`)
console.log(`   DB_USER: ${process.env.DB_USER || 'não definida'}`)
console.log(`   DB_NAME: ${process.env.DB_NAME || 'não definida'}`)
console.log(`   API_KEY: ${process.env.API_KEY ? '✓ definida' : '✗ não definida'}`)

// Middleware
app.use(cors())
app.use(express.json())

// Configuração do PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
})

// Verificação de conexão
pool.on('error', (err) => {
  console.error('❌ Erro na conexão com PostgreSQL:', err)
})

pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL com sucesso!')
})

// Aplicar autenticação em todas as rotas /api
app.use('/api', auth.verifyAccessToken)

// ============ AUTENTICAÇÃO ============

// POST /auth/login - Fazer login
app.post('/auth/login', (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        error: 'Usuário e senha são obrigatórios'
      })
    }

    const result = auth.login(username, password)

    if (!result.success) {
      return res.status(401).json({
        error: result.error,
        code: result.code
      })
    }

    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      type: 'Bearer'
    })
  } catch (error) {
    console.error('Erro ao fazer login:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /auth/refresh - Renovar access token
app.post('/auth/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token é obrigatório'
      })
    }

    const result = auth.refreshAccessToken(refreshToken)

    if (!result.success) {
      return res.status(401).json({
        error: result.error,
        code: result.code
      })
    }

    res.json({
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      type: 'Bearer'
    })
  } catch (error) {
    console.error('Erro ao renovar token:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /auth/logout - Fazer logout
app.post('/auth/logout', auth.verifyAccessToken, (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token é obrigatório'
      })
    }

    auth.logout(refreshToken)

    res.json({
      message: 'Logout realizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============ HEALTH CHECK (sem autenticação) ============

// GET / - Health check básico
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'Backend SoftClin Agenda está operacional',
    timestamp: new Date().toISOString()
  })
})

// GET /health - Health check com status do DB
app.get('/health', async (req, res) => {
  try {
    // Tenta conectar ao banco de dados com timeout
    const result = await Promise.race([
      pool.query('SELECT NOW()'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )
    ])
    
    res.status(200).json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    // Se o banco falhar, ainda assim retorna 200 para não derrubar o container
    console.log('⚠️  Health check: Banco de dados indisponível -', err.message)
    res.status(200).json({ 
      status: 'degraded',
      database: 'unavailable',
      message: 'Servidor operacional, aguardando banco de dados',
      timestamp: new Date().toISOString()
    })
  }
})

// ============ ROTAS DE PROFISSIONAIS ============

// GET /api/profissionais - Listar profissionais com filtros
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

// POST /api/profissionais - Criar novo profissional
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
        JSON.stringify(config_atendimento)
      ])

      insertedRecords.push(result.rows[0])
    }

    res.status(201).json(insertedRecords)
  } catch (error) {
    console.error('Erro ao criar profissional:', error)
    res.status(500).json({ error: error.message })
  }
})

// PATCH /api/profissionais - Atualizar profissional(is)
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
      params.push(JSON.stringify(config_atendimento))
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

// DELETE /api/profissionais - Deletar profissional(is)
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

// POST /api/agendamentos - Criar novo agendamento
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

// ============ ROTAS DE VERIFICAÇÃO ============

// DEBUG: Endpoint para verificar variáveis (remova em produção!)
app.get('/api/debug/env', (req, res) => {
  res.json({
    PORT: process.env.PORT,
    DB_USER: process.env.DB_USER,
    DB_HOST: process.env.DB_HOST ? '✓ Definida' : '✗ NÃO DEFINIDA',
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    API_KEY: process.env.API_KEY ? '✓ Definida' : '✗ NÃO DEFINIDA'
  })
})

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Servidor rodando em http://0.0.0.0:${PORT}`)
  console.log(`📡 Health check: GET http://localhost:${PORT}/health`)
  console.log(`🔌 Conectando ao banco em ${process.env.DB_HOST}:${process.env.DB_PORT}...`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
})

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  console.error('❌ Erro não capturado:', err)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor...')
  pool.end()
  process.exit(0)
})
