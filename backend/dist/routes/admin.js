"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = exports.notificationsRouter = exports.reviewsRouter = exports.servicesRouter = void 0;
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
// ──────────────────────────────────────────────────────────────
// SERVICES
// ──────────────────────────────────────────────────────────────
exports.servicesRouter = (0, express_1.Router)();
exports.servicesRouter.get('/', async (req, res) => {
    const { category, q, page = '1', limit = '24' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(50, parseInt(limit));
    let query = supabase_1.supabaseAdmin
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
    if (category)
        query = query.eq('category', category);
    if (q)
        query = query.textSearch('title', q);
    query = query
        .order('is_featured', { ascending: false })
        .order('bookings_count', { ascending: false })
        .range((pageNum - 1) * limitNum, pageNum * limitNum - 1);
    const { data, error, count } = await query;
    if (error)
        return res.status(500).json({ error: 'Failed to fetch services' });
    return res.json({ services: data, total: count });
});
exports.servicesRouter.get('/:id', async (req, res) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('services')
        .select(`*, provider_profiles(*, profiles(*))`)
        .eq('id', req.params.id)
        .single();
    if (error || !data)
        return res.status(404).json({ error: 'Service not found' });
    await supabase_1.supabaseAdmin.from('services').update({ views: (data.views || 0) + 1 }).eq('id', req.params.id);
    return res.json(data);
});
exports.servicesRouter.post('/', auth_1.authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { data: pp } = await supabase_1.supabaseAdmin.from('provider_profiles').select('id').eq('user_id', userId).single();
    if (!pp)
        return res.status(400).json({ error: 'Provider profile required' });
    const { data, error } = await supabase_1.supabaseAdmin.from('services').insert({ ...req.body, provider_id: pp.id }).select().single();
    if (error)
        return res.status(500).json({ error: 'Failed to create service' });
    return res.status(201).json(data);
});
// ──────────────────────────────────────────────────────────────
// REVIEWS
// ──────────────────────────────────────────────────────────────
exports.reviewsRouter = (0, express_1.Router)();
exports.reviewsRouter.get('/provider/:provider_user_id', async (req, res) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('reviews')
        .select(`*, profiles!reviewer_id(first_name, last_name, avatar_url)`)
        .eq('reviewee_id', req.params.provider_user_id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);
    if (error)
        return res.status(500).json({ error: 'Failed to fetch reviews' });
    return res.json(data);
});
// ──────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ──────────────────────────────────────────────────────────────
exports.notificationsRouter = (0, express_1.Router)();
exports.notificationsRouter.get('/', async (req, res) => {
    const { data } = await supabase_1.supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
    return res.json(data || []);
});
exports.notificationsRouter.patch('/read-all', async (req, res) => {
    await supabase_1.supabaseAdmin.from('notifications').update({ is_read: true }).eq('user_id', req.user.id);
    return res.json({ message: 'All notifications marked as read' });
});
exports.notificationsRouter.patch('/:id/read', async (req, res) => {
    await supabase_1.supabaseAdmin.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('user_id', req.user.id);
    return res.json({ message: 'Notification marked as read' });
});
// ──────────────────────────────────────────────────────────────
// ADMIN
// ──────────────────────────────────────────────────────────────
exports.adminRouter = (0, express_1.Router)();
exports.adminRouter.use((0, auth_1.requireRole)('admin', 'super_admin'));
exports.adminRouter.get('/stats', async (_req, res) => {
    const [users, providers, bookings, payments] = await Promise.all([
        supabase_1.supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
        supabase_1.supabaseAdmin.from('provider_profiles').select('id', { count: 'exact', head: true }),
        supabase_1.supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }),
        supabase_1.supabaseAdmin.from('payments').select('amount_kes').eq('status', 'completed'),
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
exports.adminRouter.get('/users', async (req, res) => {
    const { page = '1', limit = '50', role, status } = req.query;
    let query = supabase_1.supabaseAdmin.from('profiles').select('*', { count: 'exact' });
    if (role)
        query = query.eq('role', role);
    if (status)
        query = query.eq('status', status);
    query = query.order('created_at', { ascending: false })
        .range((parseInt(page) - 1) * parseInt(limit), parseInt(page) * parseInt(limit) - 1);
    const { data, count } = await query;
    return res.json({ users: data, total: count });
});
exports.adminRouter.patch('/users/:id/status', async (req, res) => {
    const { status } = req.body;
    const { data, error } = await supabase_1.supabaseAdmin.from('profiles').update({ status }).eq('id', req.params.id).select().single();
    if (error)
        return res.status(500).json({ error: 'Failed to update user status' });
    return res.json(data);
});
//# sourceMappingURL=admin.js.map