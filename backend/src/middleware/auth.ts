import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function requireAuth(
  req: Request & { user?: JwtPayload },
  res: Response,
  next: NextFunction
): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Token manquant' });
    return;
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET) as JwtPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}

export function socketAuthMiddleware(
  socket: Socket & { data: { user?: JwtPayload } },
  next: (err?: Error) => void
): void {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    next(new Error('Token manquant'));
    return;
  }
  try {
    socket.data.user = jwt.verify(token, JWT_SECRET) as JwtPayload;
    next();
  } catch {
    next(new Error('Token invalide'));
  }
}
