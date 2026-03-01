const express = require('express');
const router = express.Router();

let supabase = null;

try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if (url && key) {
        supabase = createClient(url, key);
    }
} catch (e) {
    console.warn('Supabase not configured:', e.message);
}

// State (workspace + sessions) lives in newsletter_state. Use SUPABASE_STATE_TABLE to override.
const TABLE = process.env.SUPABASE_STATE_TABLE || 'newsletter_state';

// GET /api/state?key=workspace | ?key=sessions
router.get('/', async (req, res) => {
    const key = req.query.key;
    if (!key) {
        return res.status(400).json({ error: 'Missing key (workspace or sessions)' });
    }

    if (!supabase) {
        return res.status(503).json({ error: 'Database not configured', configured: false });
    }

    try {
        const { data, error } = await supabase
            .from(TABLE)
            .select('value')
            .eq('key', key)
            .maybeSingle();

        if (error) {
            console.error('Supabase get error:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ value: data ? data.value : null });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/state  body: { key: 'workspace'|'sessions', value: object }
router.post('/', async (req, res) => {
    const { key, value } = req.body;
    if (!key || value === undefined) {
        return res.status(400).json({ error: 'Missing key or value' });
    }
    if (key !== 'workspace' && key !== 'sessions') {
        return res.status(400).json({ error: 'key must be workspace or sessions' });
    }

    if (!supabase) {
        return res.status(503).json({ error: 'Database not configured', configured: false });
    }

    try {
        const { error } = await supabase
            .from(TABLE)
            .upsert(
                { key, value, updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );

        if (error) {
            console.error('Supabase upsert error:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Optional: health check for DB
router.get('/config', (req, res) => {
    res.json({ configured: !!supabase });
});

module.exports = router;
