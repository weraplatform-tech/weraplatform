import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';

export interface AuthRequest {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authRouter = Router();

// Sign up endpoint
authRouter.post('/signup', async (req, res: Response) => {
  try {
    const { email, password, first_name, last_name, role = 'client' } = req.body;

    if (!email || !password || !first_name || !last_name) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      res.status(400).json({ error: authError.message });
      return;
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        first_name,
        last_name,
        role,
        status: 'active',
      });

    if (profileError) {
      res.status(400).json({ error: profileError.message });
      return;
    }

    res.status(201).json({
      message: 'User created successfully',
      user: { id: authData.user.id, email },
    });
  } catch (error) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Login endpoint
authRouter.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    res.json({
      message: 'Login successful',
      session: data.session,
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
authRouter.post('/logout', async (_req, res: Response) => {
  res.json({ message: 'Logout successful' });
});
