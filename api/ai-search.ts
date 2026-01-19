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
    const parts: string[] = [`Date: ${entry.date}`];

    if (entry.running) parts.push(`Running: Yes${entry.running_note ? ` (${entry.running_note})` : ''}`);
    if (entry.work_done) parts.push(`Work: Yes${entry.work_note ? ` (${entry.work_note})` : ''}`);
    if (entry.gym_type && entry.gym_type !== 'rest') parts.push(`Gym: ${entry.gym_type}`);
    if (entry.current_weight) parts.push(`Weight: ${entry.current_weight}kg`);
    if (entry.daily_steps) parts.push(`Steps: ${entry.daily_steps}`);
    if (entry.note) parts.push(`Note: ${entry.note}`);
    if (entry.is_highlighted) parts.push(`Starred`);
    if (entry.streak_check) parts.push(`Streak: Yes`);

    return parts.join(' | ');
  }).join('\n');

  return summary;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Service unavailable' });
  }

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
            content: `You analyze personal journal data. Respond with structured JSON only.

VOICE
Minimal. Calm. Precise.
Simple words. Short sentences.
Start with the insight. Skip the preamble.
No filler. No fluff. No teaching unless asked.
Warm but quiet. Confident but never loud.

RESPONSE FORMAT
{
  "summary": "The key insight in one clear sentence",
  "details": "Brief context if needed, otherwise null",
  "metrics": [
    {"label": "Steps", "value": "12,345", "unit": "today", "trend": "up"}
  ],
  "highlights": [
    {"date": "2024-01-15", "title": "Best day", "description": "15,000 steps"}
  ],
  "suggestion": "One actionable thought, or null"
}

GUIDELINES
- Use specific numbers. Be precise.
- Trend: "up" if good, "down" if declining, "neutral" otherwise
- highlights: only include when referencing specific dates
- metrics: use for key statistics worth showing prominently
- Keep descriptions under 10 words
- Omit empty arrays and null fields from response

Today: ${new Date().toISOString().split('T')[0]}

DATA
${dataSummary}`,
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    if (!groqResponse.ok) {
      console.error('API error:', await groqResponse.text());
      return res.status(500).json({ error: 'Service unavailable' });
    }

    const data = await groqResponse.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';

    let parsedResponse;
    try {
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
        aiResponse.match(/```\s*([\s\S]*?)\s*```/) ||
        aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      parsedResponse = JSON.parse(jsonStr);
    } catch {
      parsedResponse = {
        summary: aiResponse.trim(),
      };
    }

    return res.status(200).json({ response: parsedResponse });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Service unavailable' });
  }
}
