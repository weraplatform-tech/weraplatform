"use strict";
/**
 * WERA — AI-Powered Job Matching Service
 * OpenRouter: DeepSeek-V3 | Gemini 1.5 Flash
 * Acuity Workspace | Kadzitu Standard
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchingRouter = void 0;
const axios_1 = __importDefault(require("axios"));
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
exports.matchingRouter = (0, express_1.Router)();
async function callOpenRouter(messages, model = 'deepseek/deepseek-chat') {
    const { data } = await axios_1.default.post(OPENROUTER_API, {
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.3,
    }, {
        headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://wera.co.ke',
            'X-Title': 'Wera Labour Platform',
            'Content-Type': 'application/json',
        },
    });
    return data.choices[0].message.content;
}
// ── AI Provider Matching ──────────────────────────────────────
exports.matchingRouter.post('/providers', async (req, res) => {
    const { description, category, budget_kes, location, required_skills = [] } = req.body;
    try {
        // Fetch candidates from DB
        const { data: providers } = await supabase_1.supabaseAdmin
            .from('provider_profiles')
            .select(`
        id, title, description, category, skills,
        hourly_rate_kes, rating_avg, rating_count,
        jobs_completed, verified_skills,
        profiles!inner(first_name, last_name, county, id_verified)
      `)
            .eq('is_available', true)
            .eq('category', category)
            .order('rating_avg', { ascending: false })
            .limit(20);
        if (!providers?.length) {
            return res.json({ matches: [], message: 'No available providers found in this category.' });
        }
        const providerList = providers.map(p => ({
            id: p.id,
            name: `${p.profiles.first_name} ${p.profiles.last_name}`,
            title: p.title,
            skills: p.skills?.join(', '),
            rate_kes: p.hourly_rate_kes,
            rating: p.rating_avg,
            jobs: p.jobs_completed,
            county: p.profiles.county,
            verified: p.profiles.id_verified === 'verified',
        }));
        const prompt = `You are an expert labour matching AI for Wera, Kenya's premier labour marketplace.

Job Requirements:
- Description: ${description}
- Category: ${category}
- Budget: KES ${budget_kes || 'flexible'}
- Location: ${location || 'Nairobi'}
- Required Skills: ${required_skills.join(', ') || 'not specified'}

Available Providers (JSON):
${JSON.stringify(providerList, null, 2)}

Rank the top 5 providers by best fit. Return ONLY valid JSON array:
[{"provider_id": "...", "match_score": 0-100, "reason": "brief reason (max 20 words)"}]

Consider: skill match, rating, experience, rate vs budget, location, verification status.`;
        const aiResponse = await callOpenRouter([{ role: 'user', content: prompt }]);
        let matches = [];
        try {
            const cleaned = aiResponse.replace(/```json\n?|```/g, '').trim();
            const ranked = JSON.parse(cleaned);
            matches = ranked.map((r) => {
                const provider = providers.find(p => p.id === r.provider_id);
                return { ...provider, match_score: r.match_score, match_reason: r.reason };
            }).filter(Boolean);
        }
        catch {
            // Fallback: return raw providers sorted by rating
            matches = providers.slice(0, 5);
        }
        return res.json({ matches, ai_powered: true });
    }
    catch (err) {
        console.error('[AI Matching Error]', err);
        // Fallback without AI
        const { data: fallback } = await supabase_1.supabaseAdmin
            .from('provider_profiles')
            .select('*, profiles!inner(first_name, last_name, county)')
            .eq('is_available', true)
            .eq('category', category)
            .order('rating_avg', { ascending: false })
            .limit(5);
        return res.json({ matches: fallback || [], ai_powered: false });
    }
});
// ── AI Price Suggestion ───────────────────────────────────────
exports.matchingRouter.post('/price-suggest', async (req, res) => {
    const { category, description, location, duration_hours } = req.body;
    try {
        // Get market data
        const { data: rates } = await supabase_1.supabaseAdmin
            .from('provider_profiles')
            .select('hourly_rate_kes')
            .eq('category', category)
            .eq('is_available', true);
        const rateList = rates?.map(r => r.hourly_rate_kes) || [];
        const avgRate = rateList.length ? rateList.reduce((a, b) => a + b, 0) / rateList.length : 0;
        const minRate = Math.min(...rateList) || 0;
        const maxRate = Math.max(...rateList) || 0;
        const prompt = `You are a Kenyan labour market pricing expert.

Job Details:
- Category: ${category}
- Description: ${description}
- Location: ${location || 'Nairobi, Kenya'}
- Duration: ${duration_hours || 1} hours

Market Data (KES/hour):
- Average: ${avgRate.toFixed(0)}
- Min: ${minRate}
- Max: ${maxRate}
- Providers in category: ${rateList.length}

Suggest fair pricing in KES. Return ONLY valid JSON:
{"min_kes": number, "recommended_kes": number, "max_kes": number, "rationale": "max 30 words"}`;
        const aiResponse = await callOpenRouter([{ role: 'user', content: prompt }]);
        const cleaned = aiResponse.replace(/```json\n?|```/g, '').trim();
        const suggestion = JSON.parse(cleaned);
        return res.json({ ...suggestion, market_avg_kes: Math.round(avgRate), ai_powered: true });
    }
    catch (err) {
        // Fallback with market data
        const { data: rates } = await supabase_1.supabaseAdmin
            .from('provider_profiles')
            .select('hourly_rate_kes')
            .eq('category', category);
        const rateList = rates?.map(r => parseFloat(r.hourly_rate_kes)) || [500];
        const avg = rateList.reduce((a, b) => a + b, 0) / rateList.length;
        return res.json({
            min_kes: Math.round(avg * 0.7),
            recommended_kes: Math.round(avg),
            max_kes: Math.round(avg * 1.4),
            rationale: 'Based on market rates',
            ai_powered: false,
        });
    }
});
// ── AI Job Description Generator ─────────────────────────────
exports.matchingRouter.post('/generate-job-description', async (req, res) => {
    const { title, category, requirements } = req.body;
    try {
        const prompt = `Write a clear, professional job posting for a Kenyan labour platform.

Job: ${title}
Category: ${category}
Key Requirements: ${requirements || 'standard for this role'}

Generate a compelling job description. Return ONLY valid JSON:
{"title": "...", "description": "...", "skills_required": ["..."], "estimated_duration": "..."}

Keep description under 150 words. Skills: max 6 items. Tone: professional, Kenyan context.`;
        const aiResponse = await callOpenRouter([{ role: 'user', content: prompt }]);
        const cleaned = aiResponse.replace(/```json\n?|```/g, '').trim();
        const result = JSON.parse(cleaned);
        return res.json({ ...result, ai_powered: true });
    }
    catch {
        return res.status(500).json({ error: 'AI generation failed' });
    }
});
//# sourceMappingURL=matching.js.map