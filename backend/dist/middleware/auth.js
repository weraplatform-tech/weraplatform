"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireRole = requireRole;
const supabase_1 = require("../lib/supabase");
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid authorization header' });
        return;
    }
    const token = authHeader.slice(7);
    try {
        const { data: { user }, error } = await supabase_1.supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            res.status(401).json({ error: 'Invalid or expired token' });
            return;
        }
        // Fetch profile for role
        const { data: profile } = await supabase_1.supabaseAdmin
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
            email: user.email,
            role: profile?.role || 'client',
        };
        next();
    }
    catch {
        res.status(401).json({ error: 'Authentication failed' });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map