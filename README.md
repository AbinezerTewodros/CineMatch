<h1 align="center">🎬 CineMatch</h1>
<p align="center">An AI-powered movie recommendation web app with a smart chatbot</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Express-green?style=flat-square&logo=node.js" />
  <img src="https://img.shields.io/badge/React-Vite-blue?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=flat-square&logo=supabase" />
  <img src="https://img.shields.io/badge/AI-OpenRouter-orange?style=flat-square" />
</p>

---

## ✨ Features

- 🎬 **Movie Discovery** — Browse and search 60+ TMDB-seeded movies
- 🤖 **AI Chatbot** — Ask any movie question; the AI uses your local database as context
- ⭐ **Ratings** — Rate movies 1–10 and build your personal ratings history
- 📋 **Watchlist** — Save movies to revisit later
- 🎯 **Personalized Recommendations** — Genre + rating engine with Redis caching
- 🔐 **Auth** — JWT-based register + login system

---

## 🗂️ Project Structure

```
CineMatch/
├── backend/            # Node.js + Express API
│   ├── src/
│   │   ├── config/     # DB + Redis clients
│   │   ├── middleware/ # JWT auth + error handler
│   │   ├── routes/     # All API endpoints
│   │   ├── services/   # TMDB, recommender, chatbot logic
│   │   └── scripts/    # DB seeder
│   ├── schema.sql      # PostgreSQL schema
│   ├── .env.example    # Environment variable template
│   └── package.json
│
├── frontend/           # React + Vite + TailwindCSS SPA
│   ├── src/
│   │   ├── components/ # Layout, Sidebar, MovieCard, ChatWidget…
│   │   ├── pages/      # Login, Register, Home, Detail, Dashboard
│   │   ├── contexts/   # AuthContext (JWT state)
│   │   └── lib/        # Axios client with JWT interceptor
│   └── package.json
│
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, React Router v6 |
| Backend | Node.js, Express, JWT, bcryptjs |
| Database | PostgreSQL via Supabase |
| Cache | Redis via Upstash (optional) |
| Movie Data | TMDB API |
| AI Chatbot | OpenRouter (`openrouter/free`) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free)
- A [TMDB API key](https://www.themoviedb.org/settings/api) (free)
- An [OpenRouter API key](https://openrouter.ai/keys) (free)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 2. Set up the Backend

```bash
cd backend
cp .env.example .env
# Fill in your credentials in .env
npm install
```

Run the database schema in your Supabase SQL editor (copy-paste `schema.sql`).

Seed movies from TMDB:
```bash
npm run seed
```

Start the backend server:
```bash
npm run dev     # development (nodemon)
npm start       # production
```
> Runs on **http://localhost:5000**

### 3. Set up the Frontend

```bash
cd frontend
npm install
npm run dev
```
> Runs on **http://localhost:5173** — API calls are proxied to port 5000 automatically.

---

## 🔑 Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
PORT=5000
NODE_ENV=development

# Supabase
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# JWT
JWT_SECRET=your_super_secret_key_at_least_32_chars
JWT_EXPIRES_IN=7d

# TMDB
TMDB_API_KEY=your_tmdb_api_key
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE=https://image.tmdb.org/t/p/w500

# OpenRouter (AI Chatbot)
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Redis / Upstash (optional — caching)
REDIS_URL=rediss://your_upstash_url
```

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/movies` | — | Paginated movie list |
| GET | `/api/movies/search?q=` | — | Search by title |
| GET | `/api/recommendations` | ✅ | Personalized recommendations |
| GET | `/api/recommendations/trending` | — | Top movies by popularity |
| POST | `/api/ratings` | ✅ | Rate a movie (1–10) |
| POST | `/api/watchlist` | ✅ | Add to watchlist |
| PUT | `/api/preferences` | ✅ | Update genre preferences |
| POST | `/api/chat` | ✅ | Chat with AI assistant |

---

## 📄 License

MIT
