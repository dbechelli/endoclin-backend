/**
 * Módulo de Autenticação
 * Token fixo do .env
 */

const JWT_SECRET = process.env.JWT_SECRET
const ADMIN_USERNAME = process.env.ADMIN_USERNAME
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH

if (!JWT_SECRET || !ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) {
  console.warn('⚠️  Variáveis de autenticação não estão configuradas')
}

/**
 * Fazer login
 */
const login = (username, password) => {
  if (username !== ADMIN_USERNAME) {
    return {
      success: false,
      error: 'Usuário ou senha inválidos'
    }
  }

  if (password !== ADMIN_PASSWORD_HASH) {
    return {
      success: false,
      error: 'Usuário ou senha inválidos'
    }
  }

  return {
    success: true,
    message: 'Login realizado com sucesso'
  }
}

/**
 * Middleware para verificar token
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      error: 'Token não fornecido'
    })
  }

  if (token !== JWT_SECRET) {
    return res.status(403).json({
      error: 'Token inválido'
    })
  }

  next()
}

module.exports = {
  login,
  verifyToken,
  JWT_SECRET
}
