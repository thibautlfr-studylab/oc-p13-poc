import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { JwtPayload } from '../middleware/auth';

const prisma = new PrismaClient();

type AuthSocket = Socket & { data: { user: JwtPayload } };

export function registerChatHandlers(io: Server, socket: AuthSocket): void {
  const user = socket.data.user;

  // Client : démarre une session de chat
  socket.on('start_session', async () => {
    if (user.role !== 'client') return;

    const session = await prisma.chatSession.create({
      data: { userId: user.userId, status: 'waiting' },
    });

    socket.join(`session:${session.id}`);
    socket.emit('session_created', { sessionId: session.id });

    // Notifie tous les agents connectés
    io.emit('session_available', {
      sessionId: session.id,
      clientEmail: user.email,
      startedAt: session.startedAt,
    });
  });

  // Agent : rejoint une session en attente
  socket.on('join_session', async ({ sessionId }: { sessionId: string }) => {
    if (user.role !== 'agent') return;

    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'waiting') {
      socket.emit('error', { message: 'Session indisponible' });
      return;
    }

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'active' },
    });

    socket.join(`session:${sessionId}`);

    // Notifie client et agent que le chat est actif
    io.to(`session:${sessionId}`).emit('session_started', {
      sessionId,
      agentEmail: user.email,
    });

    // Informe les autres agents que la session n'est plus disponible
    io.emit('session_taken', { sessionId });
  });

  // Envoi d'un message
  socket.on(
    'send_message',
    async ({ sessionId, content }: { sessionId: string; content: string }) => {
      if (!content?.trim()) return;

      const message = await prisma.chatMessage.create({
        data: { sessionId, senderId: user.userId, content: content.trim() },
      });

      io.to(`session:${sessionId}`).emit('receive_message', {
        id: message.id,
        content: message.content,
        senderEmail: user.email,
        senderRole: user.role,
        sentAt: message.sentAt,
      });
    }
  );

  // Fin de session
  socket.on('end_session', async ({ sessionId }: { sessionId: string }) => {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'ended', endedAt: new Date() },
    });

    io.to(`session:${sessionId}`).emit('session_ended', { sessionId });
  });
}
