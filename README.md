# 🚀 SmartToDo API - NestJS & Clean Architecture

Sistema inteligente de gerenciamento de tarefas com autenticação JWT, integração com clima e sugestões por IA.

---

## 📌 Sobre o Projeto
O **SmartToDo** é uma API robusta desenvolvida para demonstrar padrões arquiteturais modernos, focando em escalabilidade e manutenibilidade através da **Clean Architecture**.

### 🛠 Tecnologias e Ferramentas
* **Framework:** [NestJS](https://nestjs.com/) (Node.js)
* **ORM:** [Prisma](https://www.prisma.io/)
* **Banco de Dados:** PostgreSQL (via Docker)
* **Painel de Dados:** PgAdmin (via Docker)
* **Autenticação:** JWT (JSON Web Token)
* **Validação:** Class-validator & Class-transformer

---

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos
* Node.js (v18 ou superior)
* Docker e Docker Compose instalado

### 2. Instalação
```bash
# Clonar o repositório
git clone [https://github.com/seu-usuario/smart-todo-api.git](https://github.com/seu-usuario/smart-todo-api.git)

# Entrar na pasta
cd smart-todo-api

# Instalar dependências
npm install

---

## 📚 Principais endpoints

> Todos os endpoints estão versionados sob o prefixo: `/api/v1`

### 🔐 Auth (`/auth`)

- **POST** `/auth/register`  
  Registra um novo usuário.

- **POST** `/auth/login`  
  Autentica o usuário e retorna um **access token JWT**.

- **GET** `/auth/profile`  
  Retorna o usuário autenticado.  
  **Requer** header: `Authorization: Bearer <token>`.

---

### 👤 Users (`/users`)

> Todos os endpoints abaixo requerem **JWT** válido.

- **GET** `/users`  
  Lista usuários com filtros e paginação.

- **GET** `/users/:id`  
  Busca usuário por ID.

- **POST** `/users`  
  Cria um novo usuário.

- **PATCH** `/users/:id`  
  Atualiza dados do usuário.

- **DELETE** `/users/:id`  
  Realiza soft delete (marca `deletedAt`).

---

### ✅ Todos (`/todos`)

> Endpoints para tarefas do **usuário autenticado**.  
> Requerem header `Authorization: Bearer <token>`.

- **GET** `/todos`  
  Lista tarefas com:
  - Paginação: `limit`, `offset`
  - Filtros: `status`, `priority`, `category`, `city`
  - Busca textual: `search` (em `title` e `description`)
  - Ordenação: `sort` (campo) e `order` (`asc`/`desc`)

- **GET** `/todos/:id`  
  Retorna uma tarefa específica do usuário logado.

- **POST** `/todos`  
  Cria uma nova tarefa.  
  Regra de negócio: a tarefa **sempre nasce com status `PENDING`**.

- **PATCH** `/todos/:id`  
  Atualiza campos da tarefa (título, descrição, datas, etc.).

- **PATCH** `/todos/:id/status`  
  Atualiza apenas o status da tarefa (`PENDING`, `IN_PROGRESS`, `COMPLETED`).

- **DELETE** `/todos/:id`  
  Realiza soft delete (marca `deletedAt`).

---

### 🌦 Weather (`/weather`)

- **GET** `/weather/current`  
  Retorna informações de clima atual para uma cidade, utilizando a integração com serviço externo de clima.

> **Dica:** A documentação detalhada (schemas, exemplos de request/response e autenticação) está disponível no Swagger em:  
> `http://localhost:3000/api/v1/docs`