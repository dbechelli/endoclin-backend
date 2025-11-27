# Backend SoftClin Agenda

Backend Node.js/Express para gerenciar a API de profissionais e agendamentos com PostgreSQL.

## 📋 Requisitos

- Node.js 14+
- PostgreSQL 12+
- npm ou yarn

## 🚀 Instalação

1. **Clone o repositório** (já feito)

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   
   Edite o `.env` com suas credenciais PostgreSQL:
   ```
   PORT=3001
   DB_USER=seu_usuario
   DB_PASSWORD=sua_senha
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=softclin_agenda
   API_KEY=sua_chave_api_secreta
   ```

4. **Crie as tabelas no PostgreSQL:**
   ```bash
   # Use o arquivo supabase-setup.sql como referência
   # Conecte ao seu banco e execute os comandos SQL
   ```

## 🎯 Uso

### Desenvolvimento
```bash
npm run dev
```
(Requer `nodemon` - instala automaticamente)

### Produção
```bash
npm start
```

## 📡 Endpoints

### Health Check (sem autenticação)
- `GET /health` - Verifica se o servidor está rodando

### Profissionais
- `GET /api/profissionais` - Listar todos
- `GET /api/profissionais?filter[ativo]=true` - Listar apenas ativos
- `GET /api/profissionais?orderBy=nome_exibicao` - Ordenar por nome
- `POST /api/profissionais` - Criar novo
- `PATCH /api/profissionais?filter[id]=1` - Atualizar
- `DELETE /api/profissionais?filter[id]=1` - Deletar

### Agendamentos
- `GET /api/agendamentos` - Listar todos
- `GET /api/agendamentos?orderBy=data_consulta` - Ordenar por data
- `POST /api/agendamentos` - Criar novo

## 🔐 Autenticação

Todos os endpoints `/api/*` requerem um Bearer Token no header:
```
Authorization: Bearer sua_chave_api_secreta
```

## 🧪 Testando com Postman

1. Importe a coleção: `SoftClin-Agenda-API.postman_collection.json`
2. Configure a variável `API_URL` para `http://localhost:3001/api`
3. Configure a variável `API_KEY` com o valor do `.env`
4. Teste os endpoints!

## 📁 Estrutura do Projeto

```
backend/
├── server.js           # Arquivo principal
├── package.json        # Dependências
├── .env               # Variáveis de ambiente (não comitar)
├── .env.example       # Exemplo de .env
└── README.md          # Este arquivo
```

## 🐛 Debug

O servidor exibe as variáveis carregadas ao iniciar:
```
📋 Variáveis de Ambiente Carregadas:
PORT: 3001
DB_USER: postgres
DB_HOST: localhost
DB_PORT: 5432
DB_NAME: softclin_agenda
API_KEY: ✓ Definida
```

Se houver problemas, verifique se o arquivo `.env` está no diretório raiz do backend.

## 📝 Notas

- O endpoint `/debug/env` mostra as variáveis (remova em produção!)
- Os dados de `config_atendimento` são armazenados como JSON
- Implementar validações adicionais conforme necessário
- Considere adicionar autenticação de usuário

## 📞 Suporte

Para problemas com conexão PostgreSQL, verifique:
- Credenciais no `.env`
- Se o PostgreSQL está rodando
- Firewall e conectividade de rede
