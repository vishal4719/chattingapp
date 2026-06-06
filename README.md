# Chat App

A real-time chat platform with group and 1-to-1 conversations. Admin creates chats and shares invite links. Guests join with name and phone. All data stored in PostgreSQL (Neon). Admin can demolish conversations — they disappear instantly on all devices.

## Stack

- **Frontend:** React + Vite + Tailwind CSS (port 5173)
- **Backend:** Next.js API + Socket.io custom server (port 3000)
- **Database:** PostgreSQL via Prisma (Neon)

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # add your DATABASE_URL and secrets
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Default admin (from seed):
- Email: `admin@example.com`
- Password: `admin123`

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Secret for admin JWT tokens |
| `ADMIN_EMAIL` | Seed admin email |
| `ADMIN_PASSWORD` | Seed admin password |
| `FRONTEND_URL` | Frontend origin for CORS (default: http://localhost:5173) |
| `PORT` | Backend port (default: 3000) |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend REST URL |
| `VITE_WS_URL` | Backend WebSocket URL |

## Usage

1. **Admin login** at `/login`
2. **Create** a Group Chat or 1-to-1 Chat from the dashboard
3. **Copy link** and share with users
4. **Users** open link → enter name + phone → start chatting
5. **Admin demolish** removes the conversation for everyone instantly

## Features

- Group chat (1-to-many) and direct chat (1-to-1)
- Real-time messaging via WebSockets
- Participant name, phone, and IP stored in database
- Admin can view all participants with IP addresses
- Demolish syncs to all connected clients in real time

## Security Note

Rotate your database password if it was ever shared publicly. Keep `.env` files out of version control.
