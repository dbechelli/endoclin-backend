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

// Debug: verificar se o arquivo .env existe
const envPath = '.env'

// Carregar variáveis do .env manualmente se necessário
const dotenv = require('dotenv')
const envConfig = dotenv.parse(fs.readFileSync(envPath))

// Aplicar variáveis ao process.env
Object.keys(envConfig).forEach(key => {
  process.env[key] = envConfig[key]
})

// Fallback: também tentar o método padrão
require('dotenv').config({ path: envPath })


const app = express()
const PORT = process.env.PORT || 3001

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

// Middleware de autenticação (simples)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }
  
  // Validação do token
  if (token !== process.env.API_KEY) {
    return res.status(403).json({ error: 'Token inválido' })
  }
  
  next()
}

// Aplicar autenticação em todas as rotas /api
app.use('/api', authenticateToken)

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

// Health check (sem autenticação)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend está rodando' })
})

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
app.listen(PORT, () => {
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor...')
  pool.end()
  process.exit(0)
})
