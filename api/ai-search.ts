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
  const response = await fetch(`${SUPABASE_URL}/rest/v1/daily_entries?select=*&order=date.desc`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch entries');
  }

  return response.json();
}

function summarizeEntries(entries: DailyEntry[]): string {
  const summary = entries.map(entry => {
    const parts: string[] = [`${entry.date}`];
    if (entry.running) parts.push(`run${entry.running_note ? `: ${entry.running_note}` : ''}`);
    if (entry.work_done) parts.push(`work${entry.work_note ? `: ${entry.work_note}` : ''}`);
    if (entry.gym_type && entry.gym_type !== 'rest') parts.push(`gym: ${entry.gym_type}`);
    if (entry.current_weight) parts.push(`${entry.current_weight}kg`);
    if (entry.daily_steps) parts.push(`${entry.daily_steps} steps`);
    if (entry.note) parts.push(`note: ${entry.note}`);
    if (entry.is_highlighted) parts.push(`starred`);
    if (entry.streak_check) parts.push(`streak`);
    return parts.join(' | ');
  }).join('\n');
  return summary;
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
            content: `You analyze journal data. Return JSON only.

VOICE
Start where attention should land.
No warmup. No recap. No justification.
Short sentences. Active voice. Concrete nouns.
Calm. Neutral. Assured. Human.
Never enthusiastic. Never casual.

STRUCTURE
One idea per block.
First line anchors. Subsequent lines refine.
Max 4 lines per block.
Whitespace is intentional.

FORBIDDEN
"Here's what"
"Let's"
"In simple terms"
"You might"
"This means"
Any emoji

FORMAT
{
  "summary": "Single clear sentence. The insight.",
  "metrics": [{"label": "Steps", "value": "12,345", "trend": "up"}],
  "highlights": [{"date": "2024-01-15", "title": "Best day", "description": "15k steps"}],
  "suggestion": "One actionable line or omit"
}

RULES
- summary: Required. One sentence. The answer.
- metrics: Only for statistics worth showing large. Trend: up/down/neutral.
- highlights: Only for specific dates. Title under 4 words. Description under 8.
- suggestion: Only if genuinely useful. Otherwise omit.
- Omit empty arrays.
- Numbers are precise.
- Dates as YYYY-MM-DD.

Today: ${new Date().toISOString().split('T')[0]}

DATA
${dataSummary}`,
          },
          { role: 'user', content: query },
        ],
        temperature: 0.1,
        max_tokens: 600,
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

    return res.status(200).json({ response: parsed });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Unavailable' });
  }
}
