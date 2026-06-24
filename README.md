# PoC — Support Chat en temps réel — Your Car Your Way

Ce PoC démontre la faisabilité du chat synchrone en temps réel entre un client et un agent du support, conformément à l'Architecture Definition Document.

## Stack

| Couche | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js 20 + Express + TypeScript |
| Base de données | PostgreSQL 16 |
| ORM | Prisma 5 |
| Temps réel | Socket.IO 4 |
| Auth | JWT |

## Démarrage rapide (Docker)

```bash
docker-compose up
```

L'application est accessible sur `http://localhost:5173`.

## Démarrage manuel

### Prérequis

- Node.js 20+
- PostgreSQL 16 en cours d'exécution

### Base de données

```bash
cd backend
cp .env.example .env
# Modifier DATABASE_URL dans .env si nécessaire
npm install
npx prisma migrate dev --name init
npm run db:seed
```

### Backend

```bash
cd backend
npm run dev
# Serveur sur http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Interface sur http://localhost:5173
```

## Comptes de test

| Email | Mot de passe | Rôle |
|---|---|---|
| client@ycyw.com | password123 | Client |
| agent@ycyw.com | password123 | Agent support |

## Flux de démonstration

1. Ouvrir deux onglets sur `http://localhost:5173`
2. **Onglet 1** — Se connecter en tant que client (`client@ycyw.com`) → cliquer sur "Démarrer un chat"
3. **Onglet 2** — Se connecter en tant qu'agent (`agent@ycyw.com`) → voir la session en attente → cliquer "Rejoindre"
4. Échanger des messages en temps réel
5. Cliquer "Terminer" pour clore la session

## Événements Socket.IO

| Émetteur | Événement | Description |
|---|---|---|
| Client | `start_session` | Crée une session (status: waiting) |
| Agent | `join_session` | Rejoint et active la session |
| Client/Agent | `send_message` | Envoie un message (persisté en BDD) |
| Client/Agent | `end_session` | Clôture la session |
| Serveur | `session_created` | Confirmation de création |
| Serveur | `session_available` | Notifie les agents d'une session en attente |
| Serveur | `session_started` | Notifie les deux parties que le chat est actif |
| Serveur | `receive_message` | Diffuse le message dans la room |
| Serveur | `session_ended` | Notifie la fin de session |

## Structure du projet

```
poc/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   # Schéma Prisma (User, ChatSession, ChatMessage)
│   │   └── seed.ts         # Données de test
│   ├── src/
│   │   ├── index.ts              # Serveur Express + Socket.IO
│   │   ├── middleware/auth.ts    # JWT (Express + Socket.IO)
│   │   ├── routes/auth.ts        # POST /api/auth/login, GET /api/auth/sessions
│   │   └── socket/chat.ts        # Handlers des événements chat
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Routing
│   │   ├── socket.ts       # Création du client Socket.IO
│   │   └── pages/
│   │       ├── Login.tsx   # Formulaire de connexion
│   │       └── Chat.tsx    # Interface chat (client + agent)
│   └── Dockerfile
└── docker-compose.yml
```
