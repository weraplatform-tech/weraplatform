"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.supabaseAdmin = void 0;
exports.getAuthClient = getAuthClient;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}
// Service role client — full access (server-side only, never expose to client)
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});
// Anon client — respects RLS
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
// Helper: get authenticated client from JWT
function getAuthClient(token) {
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
    });
}
//# sourceMappingURL=supabase.js.map