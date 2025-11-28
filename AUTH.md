# Sistema de Autenticação

## Visão Geral

Sistema de autenticação robusto baseado em JWT para admin único, com suporte a access tokens de curta duração e refresh tokens de longa duração.

## Endpoints de Autenticação

### 1. Login - `POST /auth/login`

Autentica o administrador e retorna tokens.

**Request:**
```json
{
  "username": "admin",
  "password": "sua-senha"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m",
  "type": "Bearer"
}
```

**Error (401):**
```json
{
  "error": "Usuário ou senha inválidos",
  "code": "INVALID_CREDENTIALS"
}
```

---

### 2. Refresh Token - `POST /auth/refresh`

Renova o access token usando um refresh token válido.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m",
  "type": "Bearer"
}
```

**Error (401):**
```json
{
  "error": "Refresh token inválido ou expirado",
  "code": "INVALID_REFRESH_TOKEN"
}
```

---

### 3. Logout - `POST /auth/logout`

Faz logout revogando o refresh token.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "message": "Logout realizado com sucesso"
}
```

---

## Usando o Access Token

Após login, adicione o access token no header de autorização para acessar os endpoints protegidos:

```bash
curl -H "Authorization: Bearer <accessToken>" \
  https://api.endoclin.cloud/api/profissionais
```

**Formato do header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Configuração

### Variáveis de Ambiente Obrigatórias

```bash
# Credenciais do admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<hash-bcrypt>

# Chaves JWT
JWT_SECRET=<chave-secreta-32-chars>
JWT_REFRESH_SECRET=<chave-refresh-32-chars>

# Tempos de expiração
JWT_EXPIRES_IN=15m        # Access token válido por 15 minutos
JWT_REFRESH_EXPIRES_IN=7d # Refresh token válido por 7 dias
```

### Gerar Valores Seguros

Execute o script de geração:

```bash
node generate-secrets.js
```

Ou para senha customizada:

```bash
node generate-secrets.js "minha-senha-super-segura"
```

---

## Fluxo de Autenticação (Frontend)

```javascript
// 1. Login
const loginResponse = await fetch('https://api.endoclin.cloud/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'sua-senha'
  })
})
const { accessToken, refreshToken } = await loginResponse.json()

// 2. Usar access token para requisições
const response = await fetch('https://api.endoclin.cloud/api/profissionais', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})

// 3. Se receber 401 (token expirado), renovar
if (response.status === 401) {
  const refreshResponse = await fetch('https://api.endoclin.cloud/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })
  const { accessToken: newAccessToken } = await refreshResponse.json()
  
  // Repetir requisição com novo token
}

// 4. Logout
await fetch('https://api.endoclin.cloud/auth/logout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({ refreshToken })
})
```

---

## Segurança

✅ **Boas práticas implementadas:**
- Senhas hash com bcryptjs
- JWT com assinatura criptográfica
- Access tokens de curta duração (15 min)
- Refresh tokens revogáveis
- Validação de tokens em todas as rotas `/api`
- Proteção contra ataques CSRF

⚠️ **Recomendações para produção:**
- Usar HTTPS obrigatório
- Guardar JWT_SECRET e JWT_REFRESH_SECRET em um vault seguro
- Usar Redis/DB para armazenar refresh tokens revogados (em vez de Set em memória)
- Implementar rate limiting em `/auth/login`
- Adicionar logs de auditoria

---

## Troubleshooting

| Erro | Causa | Solução |
|------|-------|--------|
| `INVALID_CREDENTIALS` | Username ou password errado | Verifique credenciais no .env |
| `TOKEN_EXPIRED` | Access token expirou | Use refresh token para renovar |
| `INVALID_TOKEN` | Token inválido ou manipulado | Faça login novamente |
| `INVALID_REFRESH_TOKEN` | Refresh token expirado ou revogado | Faça login novamente |
| `MISSING_TOKEN` | Header Authorization não enviado | Adicione `Authorization: Bearer <token>` |
