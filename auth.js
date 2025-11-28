/**
 * Módulo de Autenticação
 * Sistema de autenticação com JWT para Admin único
 */

const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

// Credenciais do admin (do arquivo .env)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync('admin123', 10)
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-muito-segura-aqui'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'sua-chave-refresh-muito-segura-aqui'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

// Store simples para refresh tokens (em produção, usar Redis ou DB)
const refreshTokens = new Set()

/**
 * Fazer login e retornar tokens
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

  // Gerar tokens
  const accessToken = jwt.sign(
    { username: ADMIN_USERNAME, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )

  const refreshToken = jwt.sign(
    { username: ADMIN_USERNAME, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  )

  // Armazenar refresh token
  refreshTokens.add(refreshToken)

  return {
    success: true,
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRES_IN
  }
}

/**
 * Renovar access token usando refresh token
 */
const refreshAccessToken = (refreshToken) => {
  try {
    // Verificar se o refresh token está na lista de válidos
    if (!refreshTokens.has(refreshToken)) {
      return {
        success: false,
        error: 'Refresh token inválido ou expirado',
        code: 'INVALID_REFRESH_TOKEN'
      }
    }

    // Verificar assinatura
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET)

    // Gerar novo access token
    const newAccessToken = jwt.sign(
      { username: decoded.username, type: 'access' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return {
      success: true,
      accessToken: newAccessToken,
      expiresIn: JWT_EXPIRES_IN
    }
  } catch (err) {
    return {
      success: false,
      error: 'Refresh token inválido ou expirado',
      code: 'INVALID_REFRESH_TOKEN'
    }
  }
}

/**
 * Fazer logout (revogar refresh token)
 */
const logout = (refreshToken) => {
  refreshTokens.delete(refreshToken)
  return {
    success: true,
    message: 'Logout realizado com sucesso'
  }
}

/**
 * Middleware para verificar access token
 */
const verifyAccessToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      error: 'Token não fornecido',
      code: 'MISSING_TOKEN'
    })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      })
    }
    return res.status(403).json({
      error: 'Token inválido',
      code: 'INVALID_TOKEN'
    })
  }
}

/**
 * Gerar hash de senha
 */
const hashPassword = (password) => {
  return bcrypt.hashSync(password, 10)
}

module.exports = {
  login,
  refreshAccessToken,
  logout,
  verifyAccessToken,
  hashPassword,
  ADMIN_USERNAME
}
