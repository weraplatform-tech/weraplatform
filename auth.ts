import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Fetch profile for role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (profile?.status === 'banned' || profile?.status === 'suspended') {
      res.status(403).json({ error: 'Account suspended or banned' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email!,
      role: profile?.role || 'client',
    };
    next();
  } catch {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
