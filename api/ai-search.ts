import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Allowed origins - restrict to your production domain
const ALLOWED_ORIGINS = [
  'https://tirthh.vercel.app',
  'http://localhost:5173',         // Dev only
  'http://localhost:3000',
];

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000,         // 1 minute window
  maxRequests: 10,             // Max 10 requests per minute per IP
  burstLimit: 3,               // Max 3 requests in 5 seconds
  burstWindowMs: 5 * 1000,
};

// Daily cost caps
const DAILY_LIMITS = {
  maxRequestsPerDay: 500,      // Hard cap at 500 requests/day total
  maxTokensPerDay: 500000,     // Approximate token budget
};

// Input validation
const INPUT_LIMITS = {
  maxQueryLength: 500,         // Max characters in query
  minQueryLength: 2,           // Min characters
};

// Request deduplication cache (in-memory for serverless)
const recentRequests = new Map<string, { timestamp: number; response: any }>();
const DEDUP_WINDOW_MS = 10 * 1000; // 10 second dedup window

// Rate limit tracking (in-memory - consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number; burstCount: number; burstReset: number }>();
const dailyRequestCount = { count: 0, resetDate: new Date().toISOString().split('T')[0] };

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

/**
 * Validate and restrict CORS origin
 */
function validateOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

/**
 * Get client IP with proxy support
 */
function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Check rate limits - returns error message or null if allowed
 */
function checkRateLimit(ip: string): string | null {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    // Start new window
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
      burstCount: 1,
      burstReset: now + RATE_LIMIT.burstWindowMs,
    });
    return null;
  }

  // Check burst limit
  if (now < record.burstReset) {
    if (record.burstCount >= RATE_LIMIT.burstLimit) {
      return `Too many requests. Please wait ${Math.ceil((record.burstReset - now) / 1000)} seconds.`;
    }
    record.burstCount++;
  } else {
    record.burstCount = 1;
    record.burstReset = now + RATE_LIMIT.burstWindowMs;
  }

  // Check minute limit
  if (record.count >= RATE_LIMIT.maxRequests) {
    return `Rate limit exceeded. Try again in ${Math.ceil((record.resetTime - now) / 1000)} seconds.`;
  }

  record.count++;
  return null;
}

/**
 * Check daily limits
 */
function checkDailyLimit(): string | null {
  const today = new Date().toISOString().split('T')[0];

  if (dailyRequestCount.resetDate !== today) {
    dailyRequestCount.count = 0;
    dailyRequestCount.resetDate = today;
  }

  if (dailyRequestCount.count >= DAILY_LIMITS.maxRequestsPerDay) {
    return 'Daily limit reached. Please try again tomorrow.';
  }

  dailyRequestCount.count++;
  return null;
}

/**
 * Validate input query
 */
function validateQuery(query: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query is required and must be a string' };
  }

  const trimmed = query.trim();

  if (trimmed.length < INPUT_LIMITS.minQueryLength) {
    return { valid: false, error: 'Query is too short' };
  }

  if (trimmed.length > INPUT_LIMITS.maxQueryLength) {
    return { valid: false, error: `Query exceeds ${INPUT_LIMITS.maxQueryLength} character limit` };
  }

  // Basic sanitization - remove control characters
  const sanitized = trimmed.replace(/[\x00-\x1F\x7F]/g, '');

  return { valid: true, sanitized };
}

/**
 * Generate request fingerprint for deduplication
 */
function getRequestFingerprint(query: string, ip: string): string {
  return `${ip}:${query.toLowerCase().trim()}`;
}

/**
 * Check for duplicate request
 */
function checkDuplicate(fingerprint: string): { isDuplicate: boolean; cachedResponse?: any } {
  const cached = recentRequests.get(fingerprint);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < DEDUP_WINDOW_MS) {
    return { isDuplicate: true, cachedResponse: cached.response };
  }

  return { isDuplicate: false };
}

/**
 * Cache response for deduplication
 */
function cacheResponse(fingerprint: string, response: any): void {
  recentRequests.set(fingerprint, { timestamp: Date.now(), response });

  // Cleanup old entries periodically
  if (recentRequests.size > 100) {
    const now = Date.now();
    for (const [key, value] of recentRequests.entries()) {
      if (now - value.timestamp > DEDUP_WINDOW_MS) {
        recentRequests.delete(key);
      }
    }
  }
}

/**
 * Log request for monitoring (sanitized)
 */
function logRequest(ip: string, success: boolean, error?: string): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    ip: ip.substring(0, 10) + '***', // Partially redact IP
    success,
    dailyCount: dailyRequestCount.count,
    error: error || undefined,
  };
  console.log('[AI-SEARCH]', JSON.stringify(logEntry));
}

// ============================================================================
// DATA TYPES
// ============================================================================

interface DailyEntry {
  date: string;
  running: boolean;
  running_note?: string;
  work_done: boolean;
  work_note?: string;
  streak_check?: boolean;
  gym_type: string;
  exercises: any[];
  current_weight?: number;
  daily_steps?: number;
  note?: string;
  is_highlighted?: boolean;
}

// ============================================================================
// DATA ACCESS (Server-side only)
// ============================================================================

async function fetchAllEntries(): Promise<DailyEntry[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/daily_entries?select=*&order=date.desc&limit=60`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch entries');
  return response.json();
}

async function upsertEntry(date: string, updates: Partial<DailyEntry>): Promise<any> {
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date format');
  }

  // First get existing entry
  const getResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/daily_entries?date=eq.${date}&select=*`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  const existing = await getResponse.json();
  const existingEntry = existing?.[0] || {};

  // Sanitize and merge updates
  const payload = {
    date,
    running: Boolean(updates.running ?? existingEntry.running ?? false),
    running_note: typeof updates.running_note === 'string' ? updates.running_note.slice(0, 500) : existingEntry.running_note ?? null,
    work_done: Boolean(updates.work_done ?? existingEntry.work_done ?? false),
    work_note: typeof updates.work_note === 'string' ? updates.work_note.slice(0, 500) : existingEntry.work_note ?? null,
    streak_check: Boolean(updates.streak_check ?? existingEntry.streak_check ?? false),
    gym_type: ['rest', 'push', 'pull', 'legs', 'cardio'].includes(updates.gym_type as string)
      ? updates.gym_type
      : existingEntry.gym_type ?? 'rest',
    exercises: Array.isArray(updates.exercises) ? updates.exercises.slice(0, 20) : existingEntry.exercises ?? [],
    current_weight: typeof updates.current_weight === 'number' && updates.current_weight > 0 && updates.current_weight < 500
      ? updates.current_weight
      : existingEntry.current_weight ?? null,
    daily_steps: typeof updates.daily_steps === 'number' && updates.daily_steps >= 0 && updates.daily_steps < 200000
      ? Math.round(updates.daily_steps)
      : existingEntry.daily_steps ?? null,
    note: typeof updates.note === 'string' ? updates.note.slice(0, 1000) : existingEntry.note ?? null,
    is_highlighted: Boolean(updates.is_highlighted ?? existingEntry.is_highlighted ?? false),
  };

  const upsertResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/daily_entries`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!upsertResponse.ok) {
    throw new Error('Failed to save entry');
  }

  return payload;
}

function summarizeEntries(entries: DailyEntry[]): string {
  return entries.map(entry => {
    const parts: string[] = [`${entry.date}`];
    if (entry.running) parts.push(`run${entry.running_note ? `: ${entry.running_note}` : ''}`);
    if (entry.work_done) parts.push(`work${entry.work_note ? `: ${entry.work_note}` : ''}`);
    if (entry.gym_type && entry.gym_type !== 'rest') {
      parts.push(`gym: ${entry.gym_type}`);
      if (entry.exercises?.length > 0) {
        const exerciseList = entry.exercises.map((ex: any) => {
          const sets = ex.sets?.map((s: any) => `${s.weight}kg×${s.reps}`).join(', ') || '';
          return `${ex.name}${sets ? ` (${sets})` : ''}`;
        }).join('; ');
        parts.push(`exercises: ${exerciseList}`);
      }
    }
    if (entry.current_weight) parts.push(`weight: ${entry.current_weight}kg`);
    if (entry.daily_steps) parts.push(`${entry.daily_steps} steps`);
    if (entry.note) parts.push(`note: ${entry.note}`);
    if (entry.is_highlighted) parts.push(`starred`);
    return parts.join(' | ');
  }).join('\n');
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clientIP = getClientIP(req);
  const origin = req.headers.origin as string | undefined;

  // ── CORS with origin validation ──────────────────────────────────────────
  const validOrigin = validateOrigin(origin);
  if (validOrigin) {
    res.setHeader('Access-Control-Allow-Origin', validOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── Method validation ────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    logRequest(clientIP, false, 'Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Origin validation (block unknown origins) ────────────────────────────
  if (!validOrigin) {
    logRequest(clientIP, false, 'Invalid origin');
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ── Rate limiting ────────────────────────────────────────────────────────
  const rateLimitError = checkRateLimit(clientIP);
  if (rateLimitError) {
    logRequest(clientIP, false, 'Rate limited');
    return res.status(429).json({ error: rateLimitError });
  }

  // ── Daily limit check ────────────────────────────────────────────────────
  const dailyLimitError = checkDailyLimit();
  if (dailyLimitError) {
    logRequest(clientIP, false, 'Daily limit');
    return res.status(429).json({ error: dailyLimitError });
  }

  // ── Input validation ─────────────────────────────────────────────────────
  const { query } = req.body || {};
  const validation = validateQuery(query);

  if (!validation.valid) {
    logRequest(clientIP, false, validation.error);
    return res.status(400).json({ error: validation.error });
  }

  const sanitizedQuery = validation.sanitized!;

  // ── API key check ────────────────────────────────────────────────────────
  if (!GROQ_API_KEY) {
    logRequest(clientIP, false, 'API not configured');
    return res.status(503).json({ error: 'Service unavailable' });
  }

  // ── Deduplication check ──────────────────────────────────────────────────
  const fingerprint = getRequestFingerprint(sanitizedQuery, clientIP);
  const { isDuplicate, cachedResponse } = checkDuplicate(fingerprint);

  if (isDuplicate && cachedResponse) {
    logRequest(clientIP, true, 'Cached response');
    return res.status(200).json({ response: cachedResponse, cached: true });
  }

  // ── Main logic ───────────────────────────────────────────────────────────
  try {
    const entries = await fetchAllEntries();
    const dataSummary = summarizeEntries(entries);
    const today = getTodayDate();

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a personal fitness and productivity assistant with full access to the user's journal. You can both READ data and WRITE data.

TODAY: ${today}

CAPABILITIES:
1. Answer questions about past entries, trends, stats
2. Log data: steps, weight, habits, workouts, notes
3. Suggest workouts based on history (push/pull/legs rotation)
4. Give training advice
5. Help plan the day/week

RESPONSE FORMAT (JSON):
{
  "summary": "Your response to the user",
  "action": {
    "type": "log_entry",
    "date": "YYYY-MM-DD",
    "updates": {
      "daily_steps": 10000,
      "running": true,
      "running_note": "5km morning run",
      "work_done": true,
      "work_note": "Completed project",
      "gym_type": "push|pull|legs|cardio|rest",
      "exercises": [{"name": "Bench Press", "sets": [{"weight": 60, "reps": 10}]}],
      "current_weight": 75.5,
      "note": "Felt great today"
    }
  },
  "metrics": [{"label": "Steps", "value": "10,000", "trend": "up"}],
  "highlights": [{"date": "2024-01-15", "title": "Title", "description": "Brief"}],
  "suggestion": "Optional helpful tip"
}

ACTION RULES:
- Include "action" ONLY when user wants to log/save/record something
- For logging, include only the fields user mentioned
- Use today's date unless user specifies otherwise
- gym_type must be: push, pull, legs, cardio, or rest
- exercises format: [{name, sets: [{weight, reps}]}]

WORKOUT SUGGESTIONS:
- Look at recent gym history to suggest next session
- Push: chest, shoulders, triceps
- Pull: back, biceps
- Legs: quads, hamstrings, glutes, calves
- Suggest specific exercises with progressive overload

VOICE:
- Helpful and direct
- Use actual numbers from data
- Be specific, not vague
- Keep responses concise

USER'S JOURNAL (last 60 days):
${dataSummary}`,
          },
          { role: 'user', content: sanitizedQuery },
        ],
        temperature: 0.3,
        max_tokens: 800, // Reduced for cost control
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('[GROQ ERROR]', groqResponse.status, errorText);
      logRequest(clientIP, false, `Groq error: ${groqResponse.status}`);

      // Don't retry on auth/quota errors
      if (groqResponse.status === 401 || groqResponse.status === 429) {
        return res.status(503).json({ error: 'Service temporarily unavailable' });
      }
      return res.status(500).json({ error: 'Processing failed' });
    }

    const data = await groqResponse.json();
    const content = data.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : content);
    } catch {
      parsed = { summary: content.trim() };
    }

    // Execute action if present (with validation)
    if (parsed.action?.type === 'log_entry' && parsed.action.updates) {
      const actionDate = parsed.action.date || today;
      try {
        await upsertEntry(actionDate, parsed.action.updates);
        parsed.actionExecuted = true;
        parsed.actionDate = actionDate;
      } catch (err) {
        parsed.actionError = 'Failed to save entry';
        console.error('[UPSERT ERROR]', err);
      }
    }

    // Cache successful response
    cacheResponse(fingerprint, parsed);
    logRequest(clientIP, true);

    return res.status(200).json({ response: parsed });
  } catch (error) {
    console.error('[HANDLER ERROR]', error);
    logRequest(clientIP, false, 'Internal error');
    return res.status(500).json({ error: 'An error occurred' });
  }
}
