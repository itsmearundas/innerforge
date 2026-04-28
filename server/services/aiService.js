import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function ask(messages, systemPrompt = null, max_tokens = 1024) {
  const msgs = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;
  const res = await client.chat.completions.create({
    model: 'llama3-70b-8192',
    max_tokens,
    messages: msgs,
  });
  return res.choices[0].message.content;
}

export async function analyzeJournalEntry(content) {
  const text = await ask([{ role: 'user', content: `Analyze this journal entry. Return ONLY valid JSON, no other text:\n{\n  "emotions": ["list of 3-5 detected emotions"],\n  "themes": ["list of 3-5 recurring themes"],\n  "biasesDetected": [{"name": "bias name", "severity": 1, "explanation": "1 sentence why"}],\n  "keyPhrases": ["important phrases that reveal mindset"],\n  "summary": "2 sentence psychological summary"\n}\n\nJournal entry:\n${content}` }]);
  try { return JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim()); }
  catch { return { emotions: [], themes: [], biasesDetected: [], keyPhrases: [], summary: '' }; }
}

export async function buildPsychProfile(entries, existingProfile) {
  const summary = entries.slice(0, 30).map(e =>
    `[${new Date(e.createdAt).toDateString()}] Emotions: ${e.aiInsights?.emotions?.join(', ')}. Themes: ${e.aiInsights?.themes?.join(', ')}. Biases: ${e.aiInsights?.biasesDetected?.map(b => b.name).join(', ')}.`
  ).join('\n');
  const text = await ask([{ role: 'user', content: `Build a psychological profile from these journal summaries. Return ONLY valid JSON:\n{\n  "coreValues": ["3-5 values"],\n  "topBiases": [{"name": "bias", "strength": 50, "description": "how it manifests", "frequency": 1}],\n  "recurringFears": ["fears"],\n  "recurringThemes": ["themes"],\n  "decisionPattern": "1-2 sentences",\n  "emotionBaseline": "default emotional state",\n  "growthAreas": ["areas"]\n}\n\nJournal summaries:\n${summary}\n\n${existingProfile ? `Previous profile: ${JSON.stringify(existingProfile)}` : ''}` }], null, 1500);
  try { return JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim()); }
  catch { return null; }
}

export async function stressTestIdea(idea, psychProfile) {
  const profileContext = psychProfile ? `\nUser biases: ${psychProfile.topBiases?.map(b => `${b.name} (strength ${b.strength})`).join(', ')}\nFears: ${psychProfile.recurringFears?.join(', ')}\nDecision pattern: ${psychProfile.decisionPattern}` : '';
  const text = await ask([{ role: 'user', content: `You are a brutal idea stress-tester. Return ONLY valid JSON:\n{\n  "attacks": [{"angle": "name", "argument": "argument", "severity": 5, "isPersonalized": false}],\n  "steelMan": "strongest version of the idea",\n  "overallScore": 50\n}\n\nAttack from 10 angles (mark isPersonalized=true for first 2-3 using user biases):\n1. User's blind spots (personalized)\n2. User's fears (personalized)\n3. Logic flaws\n4. Financial reality\n5. Ethics\n6. Emotional motivation\n7. Contrarian view\n8. Execution risk\n9. Timing\n10. What they're missing\n${profileContext}\n\nIdea: ${idea.title}\n${idea.content}` }], null, 2000);
  try { return JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim()); }
  catch { return { attacks: [], steelMan: '', overallScore: 50 }; }
}

export async function oracleChat(messages, psychProfile) {
  const profileCtx = psychProfile ? `Biases: ${psychProfile.topBiases?.map(b => b.name).join(', ')}\nFears: ${psychProfile.recurringFears?.join(', ')}\nDecision pattern: ${psychProfile.decisionPattern}\nThemes: ${psychProfile.recurringThemes?.join(', ')}` : 'Profile still building.';
  const system = `You are The Oracle inside InnerForge. You know this user deeply from their journal.\n${profileCtx}\n\nStart every reply with EXACTLY one of: [MODE:MIRROR] [MODE:FORGE] [MODE:COACH] [MODE:ARENA]\n- MIRROR: venting/feelings → empathetic, surface patterns\n- FORGE: idea/plan → aggressive, attack using their biases\n- COACH: growth/habits → direct, reference their patterns\n- ARENA: wants perspectives → 3 contrasting viewpoints\n2-3 sentences max. Natural spoken language.`;
  const raw = await ask(messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })), system, 1000);
  const modeMatch = raw.match(/\[MODE:(MIRROR|FORGE|COACH|ARENA)\]/);
  return { mode: modeMatch ? modeMatch[1].toLowerCase() : 'auto', text: raw.replace(/\[MODE:(MIRROR|FORGE|COACH|ARENA)\]\s*/, '').trim() };
}

export async function detectBackgroundInsights(entries, psychProfile) {
  if (entries.length < 3) return [];
  const recentSummary = entries.slice(0, 10).map(e => `${new Date(e.createdAt).toDateString()}: ${e.aiInsights?.summary || e.contentText?.slice(0, 100)}`).join('\n');
  const text = await ask([{ role: 'user', content: `Generate 1-3 proactive insights for InnerForge. Return ONLY a valid JSON array:\n[\n  {\n    "mode": "mirror",\n    "title": "Mode — hook",\n    "text": "2 sentence observation",\n    "cta": "Action →",\n    "context": "Context for Oracle prompt"\n  }\n]\n\nRecent journal:\n${recentSummary}\n\nProfile:\n${JSON.stringify(psychProfile || {})}` }], null, 1000);
  try { return JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim()); }
  catch { return []; }
}

export async function generateEvolutionNarrative(profileHistory) {
  if (profileHistory.length < 2) return null;
  return await ask([{ role: 'user', content: `Write a 3-4 sentence growth narrative comparing these two psychological profiles. Be specific and honest.\n\nOlder (${profileHistory[0].takenAt}):\n${JSON.stringify(profileHistory[0].snapshot)}\n\nRecent (${profileHistory[profileHistory.length-1].takenAt}):\n${JSON.stringify(profileHistory[profileHistory.length-1].snapshot)}` }], null, 500);
}