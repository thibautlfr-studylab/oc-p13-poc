import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import { registerChatHandlers } from './socket/chat';
import { socketAuthMiddleware } from './middleware/auth';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: { origin: frontendUrl, credentials: true },
});

app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
  console.log(`Socket connecté : ${socket.id} (${socket.data.user?.email})`);
  registerChatHandlers(io, socket);
  socket.on('disconnect', () => {
    console.log(`Socket déconnecté : ${socket.id}`);
  });
});

const PORT = Number(process.env.PORT) || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur http://0.0.0.0:${PORT}`);
});
