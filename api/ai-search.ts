import type { VercelRequest, VercelResponse } from '@vercel/node';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

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

  // Merge with updates
  const payload = {
    date,
    running: updates.running ?? existingEntry.running ?? false,
    running_note: updates.running_note ?? existingEntry.running_note ?? null,
    work_done: updates.work_done ?? existingEntry.work_done ?? false,
    work_note: updates.work_note ?? existingEntry.work_note ?? null,
    streak_check: updates.streak_check ?? existingEntry.streak_check ?? false,
    gym_type: updates.gym_type ?? existingEntry.gym_type ?? 'rest',
    exercises: updates.exercises ?? existingEntry.exercises ?? [],
    current_weight: updates.current_weight ?? existingEntry.current_weight ?? null,
    daily_steps: updates.daily_steps ?? existingEntry.daily_steps ?? null,
    note: updates.note ?? existingEntry.note ?? null,
    is_highlighted: updates.is_highlighted ?? existingEntry.is_highlighted ?? false,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'Unavailable' });

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
          { role: 'user', content: query },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!groqResponse.ok) {
      console.error('Error:', await groqResponse.text());
      return res.status(500).json({ error: 'Unavailable' });
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

    // Execute action if present
    if (parsed.action?.type === 'log_entry' && parsed.action.updates) {
      const actionDate = parsed.action.date || today;
      try {
        await upsertEntry(actionDate, parsed.action.updates);
        parsed.actionExecuted = true;
        parsed.actionDate = actionDate;
      } catch (err) {
        parsed.actionError = 'Failed to save entry';
      }
    }

    return res.status(200).json({ response: parsed });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Unavailable' });
  }
}
