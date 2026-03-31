import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

// ──────────────────────────────────────────────────────────────
// SERVICES
// ──────────────────────────────────────────────────────────────
export const servicesRouter = Router();

servicesRouter.get('/', async (req, res) => {
  const { category, q, page = '1', limit = '24' } = req.query as Record<string, string>;
  const pageNum = parseInt(page);
  const limitNum = Math.min(50, parseInt(limit));

  let query = supabaseAdmin
    .from('services')
    .select(`
      id, title, description, category, price_kes, price_type,
      images, tags, views, bookings_count, is_featured,
      provider_profiles!inner(
        id, rating_avg, rating_count,
        profiles!inner(first_name, last_name, avatar_url, county)
      )
    `, { count: 'exact' })
    .eq('is_active', true);

  if (category) query = query.eq('category', category);
  if (q) query = query.textSearch('title', q);
  query = query
    .order('is_featured', { ascending: false })
    .order('bookings_count', { ascending: false })
    .range((pageNum - 1) * limitNum, pageNum * limitNum - 1);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: 'Failed to fetch services' });
  return res.json({ services: data, total: count });
});

servicesRouter.get('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('services')
    .select(`*, provider_profiles(*, profiles(*))`)
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Service not found' });
  await supabaseAdmin.from('services').update({ views: (data.views || 0) + 1 }).eq('id', req.params.id);
  return res.json(data);
});

servicesRouter.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { data: pp } = await supabaseAdmin.from('provider_profiles').select('id').eq('user_id', userId).single();
  if (!pp) return res.status(400).json({ error: 'Provider profile required' });

  const { data, error } = await supabaseAdmin.from('services').insert({ ...req.body, provider_id: pp.id }).select().single();
  if (error) return res.status(500).json({ error: 'Failed to create service' });
  return res.status(201).json(data);
});

// ──────────────────────────────────────────────────────────────
// REVIEWS
// ──────────────────────────────────────────────────────────────
export const reviewsRouter = Router();

reviewsRouter.get('/provider/:provider_user_id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select(`*, profiles!reviewer_id(first_name, last_name, avatar_url)`)
    .eq('reviewee_id', req.params.provider_user_id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: 'Failed to fetch reviews' });
  return res.json(data);
});

// ──────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ──────────────────────────────────────────────────────────────
export const notificationsRouter = Router();

notificationsRouter.get('/', async (req: AuthRequest, res) => {
  const { data } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false })
    .limit(50);
  return res.json(data || []);
});

notificationsRouter.patch('/read-all', async (req: AuthRequest, res) => {
  await supabaseAdmin.from('notifications').update({ is_read: true }).eq('user_id', req.user!.id);
  return res.json({ message: 'All notifications marked as read' });
});

notificationsRouter.patch('/:id/read', async (req: AuthRequest, res) => {
  await supabaseAdmin.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('user_id', req.user!.id);
  return res.json({ message: 'Notification marked as read' });
});

// ──────────────────────────────────────────────────────────────
// ADMIN
// ──────────────────────────────────────────────────────────────
export const adminRouter = Router();
adminRouter.use(requireRole('admin', 'super_admin'));

adminRouter.get('/stats', async (_req, res) => {
  const [users, providers, bookings, payments] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('provider_profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('payments').select('amount_kes').eq('status', 'completed'),
  ]);

  const totalRevenue = payments.data?.reduce((sum, p) => sum + parseFloat(p.amount_kes), 0) || 0;
  const platformRevenue = totalRevenue * 0.15;

  return res.json({
    total_users: users.count || 0,
    total_providers: providers.count || 0,
    total_bookings: bookings.count || 0,
    total_gmv_kes: totalRevenue,
    platform_revenue_kes: platformRevenue,
    currency: 'KES',
  });
});

adminRouter.get('/users', async (req, res) => {
  const { page = '1', limit = '50', role, status } = req.query as Record<string, string>;
  let query = supabaseAdmin.from('profiles').select('*', { count: 'exact' });
  if (role) query = query.eq('role', role);
  if (status) query = query.eq('status', status);
  query = query.order('created_at', { ascending: false })
    .range((parseInt(page) - 1) * parseInt(limit), parseInt(page) * parseInt(limit) - 1);
  const { data, count } = await query;
  return res.json({ users: data, total: count });
});

adminRouter.patch('/users/:id/status', async (req, res) => {
  const { status } = req.body;
  const { data, error } = await supabaseAdmin.from('profiles').update({ status }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: 'Failed to update user status' });
  return res.json(data);
});
