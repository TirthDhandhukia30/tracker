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
    if (entry.is_highlighted) parts.push(`⭐ Highlighted day`);
    if (entry.streak_check) parts.push(`Streak: Checked`);

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
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
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
            content: `You are an intelligent personal journal analyst. Your role is to analyze the user's daily tracking data and provide clear, insightful responses.

RESPONSE FORMAT:
Always respond with valid JSON in this structure:
{
  "summary": "A brief 1-2 sentence summary of the insight",
  "details": "Optional longer explanation if needed",
  "metrics": [
    {"label": "Metric Name", "value": "12,345", "unit": "steps", "trend": "up|down|neutral"}
  ],
  "highlights": [
    {"date": "2024-01-15", "title": "Best Day", "description": "Walked 15,000 steps"}
  ],
  "suggestion": "Optional actionable suggestion"
}

ANALYSIS GUIDELINES:
- Be analytical and data-driven
- Use specific numbers and dates
- Compare to averages when relevant
- Identify patterns and trends
- Keep summaries concise but insightful
- For step queries, always include the exact step count
- For date queries, include the specific dates found
- For trend questions, calculate actual percentages

DATA CONTEXT:
Today's date: ${new Date().toISOString().split('T')[0]}

USER'S JOURNAL DATA:
${dataSummary}`,
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!groqResponse.ok) {
      const error = await groqResponse.text();
      console.error('Groq API error:', error);
      return res.status(500).json({ error: 'AI service error' });
    }

    const data = await groqResponse.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';

    // Try to parse as JSON, fallback to text response
    let parsedResponse;
    try {
      // Extract JSON from response if wrapped in code blocks
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
        aiResponse.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
      parsedResponse = JSON.parse(jsonStr);
    } catch {
      // Fallback to simple text response
      parsedResponse = {
        summary: aiResponse,
        details: null,
        metrics: [],
        highlights: [],
        suggestion: null
      };
    }

    return res.status(200).json({ response: parsedResponse });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
