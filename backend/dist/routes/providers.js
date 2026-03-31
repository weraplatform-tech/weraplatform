"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providersRouter = void 0;
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
exports.providersRouter = (0, express_1.Router)();
// ── List providers (public) ───────────────────────────────────
exports.providersRouter.get('/', async (req, res) => {
    const { category, lat, lng, radius_km = '30', min_rate, max_rate, min_rating, page = '1', limit = '20', q } = req.query;
    try {
        let query = supabase_1.supabaseAdmin
            .from('provider_profiles')
            .select(`
        id, category, subcategory, title, description,
        hourly_rate_kes, daily_rate_kes, experience_years,
        skills, rating_avg, rating_count, jobs_completed,
        is_available, verified_skills,
        profiles!inner(
          id, first_name, last_name, avatar_url,
          location, county, id_verified, status
        )
      `)
            .eq('profiles.status', 'active')
            .eq('is_available', true);
        if (category)
            query = query.eq('category', category);
        if (min_rate)
            query = query.gte('hourly_rate_kes', parseFloat(min_rate));
        if (max_rate)
            query = query.lte('hourly_rate_kes', parseFloat(max_rate));
        if (min_rating)
            query = query.gte('rating_avg', parseFloat(min_rating));
        if (q)
            query = query.textSearch('title', q);
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, parseInt(limit));
        query = query.range((pageNum - 1) * limitNum, pageNum * limitNum - 1);
        query = query.order('rating_avg', { ascending: false });
        const { data, error, count } = await query;
        if (error)
            throw error;
        return res.json({ providers: data, total: count, page: pageNum, limit: limitNum });
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to fetch providers' });
    }
});
// ── Get single provider ───────────────────────────────────────
exports.providersRouter.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('provider_profiles')
            .select(`
        *,
        profiles!inner(
          id, first_name, last_name, avatar_url, bio,
          location, county, created_at, id_verified
        ),
        services(id, title, price_kes, price_type, images, is_active),
        user_certifications(title, issuer, issued_at, cert_url, verified)
      `)
            .eq('id', id)
            .single();
        if (error || !data)
            return res.status(404).json({ error: 'Provider not found' });
        return res.json(data);
    }
    catch {
        return res.status(500).json({ error: 'Failed to fetch provider' });
    }
});
// ── Provider reviews ──────────────────────────────────────────
exports.providersRouter.get('/:id/reviews', async (req, res) => {
    const { id } = req.params;
    const { page = '1', limit = '10' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    try {
        const { data, error, count } = await supabase_1.supabaseAdmin
            .from('reviews')
            .select(`
        id, rating, title, body, created_at, response, response_at,
        profiles!reviewer_id(first_name, last_name, avatar_url)
      `, { count: 'exact' })
            .eq('reviewee_id', id)
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .range((pageNum - 1) * limitNum, pageNum * limitNum - 1);
        if (error)
            throw error;
        return res.json({ reviews: data, total: count });
    }
    catch {
        return res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});
// ── Create / update provider profile ─────────────────────────
exports.providersRouter.post('/profile', auth_1.authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { category, subcategory, title, description, hourly_rate_kes, daily_rate_kes, experience_years, skills, languages, radius_km, portfolio_urls } = req.body;
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('provider_profiles')
            .upsert({
            user_id: userId,
            category, subcategory, title, description,
            hourly_rate_kes, daily_rate_kes, experience_years,
            skills, languages, radius_km, portfolio_urls,
        }, { onConflict: 'user_id' })
            .select()
            .single();
        if (error)
            throw error;
        // Update user role to provider
        await supabase_1.supabaseAdmin.from('profiles').update({ role: 'provider' }).eq('id', userId);
        return res.status(201).json(data);
    }
    catch {
        return res.status(500).json({ error: 'Failed to create provider profile' });
    }
});
// ── Toggle availability ───────────────────────────────────────
exports.providersRouter.patch('/availability', auth_1.authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { is_available } = req.body;
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('provider_profiles')
            .update({ is_available })
            .eq('user_id', userId)
            .select('is_available')
            .single();
        if (error)
            throw error;
        return res.json(data);
    }
    catch {
        return res.status(500).json({ error: 'Failed to update availability' });
    }
});
//# sourceMappingURL=providers.js.map