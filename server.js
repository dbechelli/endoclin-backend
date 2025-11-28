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
    
    res.json({ token: result.token, username: result.username })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/auth/logout', (req, res) => {
  res.json({ message: 'Logout OK' })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n✅ Servidor rodando na porta ${PORT}`)
})

process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando...')
  process.exit(0)
})
