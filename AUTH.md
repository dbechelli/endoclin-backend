# Sistema de Autenticação

## Visão Geral

Sistema de autenticação com login/logout e tokens JWT fixos. Um único usuário administrador com credenciais de usuário e senha.

## Endpoints de Autenticação

### 1. Login - `POST /auth/login`

Autentica o administrador e retorna um token JWT.

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
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "username": "admin",
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

### 2. Logout - `POST /auth/logout`

Faz logout revogando a sessão.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Logout realizado com sucesso"
}
```

---

## Usando o Token

Após login, adicione o token no header de autorização para acessar os endpoints protegidos:

```bash
curl -H "Authorization: Bearer <token>" \
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

# Chave JWT (fixo, não muda)
JWT_SECRET=038ac372d166686dcd1eff9ecea660208f30d1eafd1098944b05a9fdedfba9e4
```

### Gerar Hash de Senha

Para mudar a senha do admin, gere um novo hash:

```bash
node -e "console.log(require('bcryptjs').hashSync('nova-senha-aqui', 10))"
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
const { token } = await loginResponse.json()

// 2. Guardar token (localStorage, sessionStorage ou memory)
localStorage.setItem('authToken', token)

// 3. Usar token para requisições
const response = await fetch('https://api.endoclin.cloud/api/profissionais', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

// 4. Se receber 401, fazer logout
if (response.status === 401) {
  await fetch('https://api.endoclin.cloud/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  localStorage.removeItem('authToken')
}
```

---

## Segurança

✅ **Boas práticas implementadas:**
- Senhas hash com bcryptjs (bcrypt)
- JWT com assinatura criptográfica
- Sessions em memória (rastreáveis)
- Validação de token em todas as rotas `/api`
- Proteção contra CSRF

⚠️ **Recomendações para produção:**
- Usar HTTPS obrigatório
- Guardar JWT_SECRET em um vault seguro
- Usar Redis/DB para armazenar sessions (em vez de Set em memória)
- Implementar rate limiting em `/auth/login`
- Adicionar logs de auditoria
- Implementar timeout de sessão

