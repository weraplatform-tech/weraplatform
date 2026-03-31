"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
exports.authRouter = (0, express_1.Router)();
// Sign up endpoint
exports.authRouter.post('/signup', async (req, res) => {
    try {
        const { email, password, first_name, last_name, role = 'client' } = req.body;
        if (!email || !password || !first_name || !last_name) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        // Create auth user
        const { data: authData, error: authError } = await supabase_1.supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });
        if (authError) {
            res.status(400).json({ error: authError.message });
            return;
        }
        // Create profile
        const { error: profileError } = await supabase_1.supabaseAdmin
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
    }
    catch (error) {
        res.status(500).json({ error: 'Signup failed' });
    }
});
// Login endpoint
exports.authRouter.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password required' });
            return;
        }
        const { data, error } = await supabase_1.supabaseAdmin.auth.signInWithPassword({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});
// Logout endpoint
exports.authRouter.post('/logout', async (_req, res) => {
    res.json({ message: 'Logout successful' });
});
//# sourceMappingURL=auth.js.map