"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingsRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const supabase_1 = require("../lib/supabase");
exports.bookingsRouter = (0, express_1.Router)();
// ── Create booking ────────────────────────────────────────────
exports.bookingsRouter.post('/', [
    (0, express_validator_1.body)('provider_id').isUUID(),
    (0, express_validator_1.body)('title').trim().isLength({ min: 5 }),
    (0, express_validator_1.body)('scheduled_start').isISO8601(),
    (0, express_validator_1.body)('quoted_amount_kes').isNumeric().isFloat({ min: 1 }),
    (0, express_validator_1.body)('job_type').isIn(['one_time', 'recurring', 'full_time', 'part_time', 'contract']),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
    const clientId = req.user.id;
    const { provider_id, service_id, title, description, location, scheduled_start, scheduled_end, quoted_amount_kes, job_type, notes } = req.body;
    try {
        // Get provider's user_id from provider_profiles
        const { data: providerProfile } = await supabase_1.supabaseAdmin
            .from('provider_profiles')
            .select('user_id')
            .eq('id', provider_id)
            .single();
        if (!providerProfile)
            return res.status(404).json({ error: 'Provider not found' });
        const { data, error } = await supabase_1.supabaseAdmin.from('bookings').insert({
            client_id: clientId,
            provider_id: providerProfile.user_id,
            service_id: service_id || null,
            title, description, location,
            scheduled_start, scheduled_end,
            quoted_amount_kes, job_type, notes,
            status: 'pending',
        }).select().single();
        if (error)
            throw error;
        // Notify provider
        await supabase_1.supabaseAdmin.from('notifications').insert({
            user_id: providerProfile.user_id,
            type: 'booking',
            title: 'New Booking Request',
            body: `You have a new booking request: "${title}". Quoted: KES ${parseFloat(quoted_amount_kes).toLocaleString()}.`,
            action_url: `/bookings/${data.id}`,
        });
        return res.status(201).json(data);
    }
    catch (err) {
        console.error('[Booking Create Error]', err);
        return res.status(500).json({ error: 'Failed to create booking' });
    }
});
// ── Get my bookings ───────────────────────────────────────────
exports.bookingsRouter.get('/', async (req, res) => {
    const userId = req.user.id;
    const { role = 'client', status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(50, parseInt(limit));
    try {
        let query = supabase_1.supabaseAdmin
            .from('bookings')
            .select(`
        *,
        client:profiles!client_id(id, first_name, last_name, avatar_url, phone),
        provider:profiles!provider_id(id, first_name, last_name, avatar_url, phone),
        payments(id, status, amount_kes, method, mpesa_receipt)
      `, { count: 'exact' });
        query = role === 'provider'
            ? query.eq('provider_id', userId)
            : query.eq('client_id', userId);
        if (status)
            query = query.eq('status', status);
        query = query.order('created_at', { ascending: false })
            .range((pageNum - 1) * limitNum, pageNum * limitNum - 1);
        const { data, error, count } = await query;
        if (error)
            throw error;
        return res.json({ bookings: data, total: count });
    }
    catch {
        return res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});
// ── Get single booking ────────────────────────────────────────
exports.bookingsRouter.get('/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('bookings')
            .select(`
        *,
        client:profiles!client_id(*),
        provider:profiles!provider_id(*),
        service:services(id, title, images),
        payments(*),
        reviews(*)
      `)
            .eq('id', id)
            .or(`client_id.eq.${userId},provider_id.eq.${userId}`)
            .single();
        if (error || !data)
            return res.status(404).json({ error: 'Booking not found' });
        return res.json(data);
    }
    catch {
        return res.status(500).json({ error: 'Failed to fetch booking' });
    }
});
// ── Update booking status ─────────────────────────────────────
exports.bookingsRouter.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, cancellation_reason } = req.body;
    const userId = req.user.id;
    const VALID_TRANSITIONS = {
        pending: ['accepted', 'cancelled'],
        accepted: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'disputed'],
        completed: [],
        cancelled: [],
        disputed: ['completed', 'cancelled'],
    };
    try {
        const { data: booking } = await supabase_1.supabaseAdmin
            .from('bookings')
            .select('status, client_id, provider_id')
            .eq('id', id)
            .single();
        if (!booking)
            return res.status(404).json({ error: 'Booking not found' });
        if (booking.client_id !== userId && booking.provider_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        if (!VALID_TRANSITIONS[booking.status]?.includes(status)) {
            return res.status(400).json({ error: `Cannot transition from ${booking.status} to ${status}` });
        }
        const { data, error } = await supabase_1.supabaseAdmin
            .from('bookings')
            .update({ status, cancellation_reason: cancellation_reason || null })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        // Notify the other party
        const notifyId = userId === booking.client_id ? booking.provider_id : booking.client_id;
        const statusMessages = {
            accepted: 'Your booking has been accepted!',
            in_progress: 'Work has started on your booking.',
            completed: 'Your booking has been marked as complete.',
            cancelled: 'A booking has been cancelled.',
            disputed: 'A dispute has been raised on a booking.',
        };
        await supabase_1.supabaseAdmin.from('notifications').insert({
            user_id: notifyId,
            type: 'booking',
            title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            body: statusMessages[status] || `Booking status updated to ${status}.`,
            action_url: `/bookings/${id}`,
        });
        return res.json(data);
    }
    catch {
        return res.status(500).json({ error: 'Failed to update booking status' });
    }
});
// ── Submit review after completion ───────────────────────────
exports.bookingsRouter.post('/:id/review', [
    (0, express_validator_1.body)('rating').isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('body').trim().isLength({ min: 10 }),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
    const { id } = req.params;
    const { rating, title, body } = req.body;
    const userId = req.user.id;
    try {
        const { data: booking } = await supabase_1.supabaseAdmin
            .from('bookings')
            .select('status, client_id, provider_id')
            .eq('id', id)
            .single();
        if (!booking)
            return res.status(404).json({ error: 'Booking not found' });
        if (booking.status !== 'completed')
            return res.status(400).json({ error: 'Booking must be completed to leave a review' });
        if (booking.client_id !== userId)
            return res.status(403).json({ error: 'Only the client can review' });
        const { data, error } = await supabase_1.supabaseAdmin.from('reviews').insert({
            booking_id: id,
            reviewer_id: userId,
            reviewee_id: booking.provider_id,
            rating, title, body: body,
        }).select().single();
        if (error)
            throw error;
        return res.status(201).json(data);
    }
    catch {
        return res.status(500).json({ error: 'Failed to submit review' });
    }
});
//# sourceMappingURL=bookings.js.map