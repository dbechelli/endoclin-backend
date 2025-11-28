/**
 * Módulo de Autenticação
 * Validação de JWT para Admin único
 */

const jwt = require('jsonwebtoken')

// Secrets fixos do .env
const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET

// Validar que as variáveis obrigatórias estão configuradas
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('❌ JWT_SECRET e JWT_REFRESH_SECRET não configurados no .env!')
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

module.exports = {
  verifyAccessToken,
  JWT_SECRET,
  JWT_REFRESH_SECRET
}
