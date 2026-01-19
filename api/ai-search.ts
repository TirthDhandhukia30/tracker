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
  // Create a condensed summary for the AI context
  const summary = entries.map(entry => {
    const parts: string[] = [`Date: ${entry.date}`];

    if (entry.running) parts.push(`Running: Yes${entry.running_note ? ` (${entry.running_note})` : ''}`);
    if (entry.work_done) parts.push(`Work: Yes${entry.work_note ? ` (${entry.work_note})` : ''}`);
    if (entry.gym_type && entry.gym_type !== 'rest') parts.push(`Gym: ${entry.gym_type}`);
    if (entry.current_weight) parts.push(`Weight: ${entry.current_weight}kg`);
    if (entry.daily_steps) parts.push(`Steps: ${entry.daily_steps}`);
    if (entry.note) parts.push(`Note: ${entry.note}`);
    if (entry.is_highlighted) parts.push(`⭐ Highlighted day`);
    if (entry.streak_check) parts.push(`Streak: Checked`);

    return parts.join(' | ');
  }).join('\n');

  return summary;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
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
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  try {
    // Fetch all entries from Supabase
    const entries = await fetchAllEntries();
    const dataSummary = summarizeEntries(entries);

    // Call Groq API
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
            content: `You are a helpful AI assistant that helps analyze a personal daily tracking journal. You have access to the user's daily entries which include:
- Running/exercise activities and notes
- Work accomplishments and notes
- Gym workouts (push, pull, legs, cardio, or rest)
- Daily weight measurements
- Step counts
- Personal notes and reflections
- Highlighted/starred special days
- Streak check-ins

Analyze the data and answer the user's questions helpfully. Be concise but informative. If asked about best/worst days, look at the metrics. If asked about specific activities, search the notes. Today's date is ${new Date().toISOString().split('T')[0]}.

Here is the user's journal data:
${dataSummary}`,
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!groqResponse.ok) {
      const error = await groqResponse.text();
      console.error('Groq API error:', error);
      return res.status(500).json({ error: 'AI service error' });
    }

    const data = await groqResponse.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No response generated';

    return res.status(200).json({ response: aiResponse });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
