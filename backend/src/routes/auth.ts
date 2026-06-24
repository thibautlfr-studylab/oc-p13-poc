import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { requireAuth, JwtPayload } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email et mot de passe requis' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Identifiants invalides' });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, role: user.role, email: user.email });
});

// Pour les agents : liste des sessions en attente
router.get(
  '/sessions',
  requireAuth,
  async (req: Request & { user?: JwtPayload }, res: Response): Promise<void> => {
    if (req.user?.role !== 'agent') {
      res.status(403).json({ error: 'Réservé aux agents' });
      return;
    }
    const sessions = await prisma.chatSession.findMany({
      where: { status: 'waiting' },
      include: { user: { select: { email: true, firstName: true } } },
      orderBy: { startedAt: 'asc' },
    });
    res.json(sessions);
  }
);

export default router;
