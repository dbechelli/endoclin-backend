#!/usr/bin/env node

/**
 * Script para gerar valores seguros para o .env
 * Uso: node generate-secrets.js
 */

const crypto = require('crypto')
const bcrypt = require('bcryptjs')

console.log('\n🔐 Gerando valores seguros para .env...\n')

// Gerar JWT_SECRET
const jwtSecret = crypto.randomBytes(32).toString('hex')
console.log('JWT_SECRET:')
console.log(jwtSecret)
console.log()

// Gerar JWT_REFRESH_SECRET
const jwtRefreshSecret = crypto.randomBytes(32).toString('hex')
console.log('JWT_REFRESH_SECRET:')
console.log(jwtRefreshSecret)
console.log()

// Gerar hash de senha (padrão: admin123)
const password = process.argv[2] || 'admin123'
const passwordHash = bcrypt.hashSync(password, 10)
console.log(`ADMIN_PASSWORD_HASH (senha: "${password}")`)
console.log(passwordHash)
console.log()

console.log('✅ Copie os valores acima para seu arquivo .env\n')
