/**
 * Módulo de Autenticação
 * Login/Logout com tokens JWT fixos
 */

const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

// Secrets fixos do .env
const JWT_SECRET = process.env.JWT_SECRET
const ADMIN_USERNAME = process.env.ADMIN_USERNAME
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH

// Validar que as variáveis obrigatórias estão configuradas
if (!JWT_SECRET || !ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) {
  throw new Error('❌ JWT_SECRET, ADMIN_USERNAME e ADMIN_PASSWORD_HASH não configurados no .env!')
}

// Store simples para sessions ativas (em produção, usar Redis ou DB)
const activeSessions = new Map()

/**
 * Fazer login com usuário e senha
 */
const login = (username, password) => {
  // Verificar credenciais
  if (username !== ADMIN_USERNAME) {
    return {
      success: false,
      error: 'Usuário ou senha inválidos',
      code: 'INVALID_CREDENTIALS'
    }
  }

  if (!bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    return {
      success: false,
      error: 'Usuário ou senha inválidos',
      code: 'INVALID_CREDENTIALS'
    }
  }

  // Gerar token JWT fixo (assina com o username para rastreabilidade)
  const token = jwt.sign(
    { username: ADMIN_USERNAME, loginTime: new Date().toISOString() },
    JWT_SECRET
    // Sem expiração - token fixo
  )

  // Armazenar session
  const sessionId = token
  activeSessions.set(sessionId, {
    username: ADMIN_USERNAME,
    loginTime: new Date(),
    lastActivity: new Date()
  })

  return {
    success: true,
    token,
    username: ADMIN_USERNAME
  }
}

/**
 * Fazer logout (revogar token)
 */
const logout = (token) => {
  activeSessions.delete(token)
  return {
    success: true,
    message: 'Logout realizado com sucesso'
  }
}

/**
 * Verificar se a sessão está ativa
 */
const isSessionActive = (token) => {
  return activeSessions.has(token)
}

/**
 * Middleware para verificar token
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      error: 'Token não fornecido',
      code: 'MISSING_TOKEN'
    })
  }

  // Verificar se a sessão está ativa
  if (!isSessionActive(token)) {
    return res.status(401).json({
      error: 'Sessão inválida ou expirada',
      code: 'INVALID_SESSION'
    })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    req.token = token
    
    // Atualizar last activity
    const session = activeSessions.get(token)
    if (session) {
      session.lastActivity = new Date()
    }
    
    next()
  } catch (err) {
    return res.status(403).json({
      error: 'Token inválido',
      code: 'INVALID_TOKEN'
    })
  }
}

module.exports = {
  login,
  logout,
  verifyToken,
  isSessionActive,
  JWT_SECRET
}
