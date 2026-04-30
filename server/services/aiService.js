import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function ask(messages, systemPrompt = null, max_tokens = 1024) {
  const msgs = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;
  const res = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
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
  const text = await ask([{ role: 'user', content: `You are a brutal idea stress-tester. Return ONLY valid JSON:\n{\n  "attacks": [{"angle": "name", "argument": "argument", "severity": 5, "isPersonalized": false}],\n  "steelMan": "strongest version of the idea",\n  "overallScore": 50\n}\n\nAttack from 10 angles (mark isPersonalized=true for first 2-3 using user biases):\n1. User blind spots (personalized)\n2. User fears (personalized)\n3. Logic flaws\n4. Financial reality\n5. Ethics\n6. Emotional motivation\n7. Contrarian view\n8. Execution risk\n9. Timing\n10. What they are missing\n${profileContext}\n\nIdea: ${idea.title}\n${idea.content}` }], null, 2000);
  try { return JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim()); }
  catch { return { attacks: [], steelMan: '', overallScore: 50 }; }
}

export async function oracleChat(messages, psychProfile, relationshipStage = 'stranger', totalExchanges = 0) {
  const profileCtx = psychProfile
    ? `Psychological profile:\n- Biases: ${psychProfile.topBiases?.map(b => b.name).join(', ')}\n- Fears: ${psychProfile.recurringFears?.join(', ')}\n- Decision pattern: ${psychProfile.decisionPattern}\n- Recurring themes: ${psychProfile.recurringThemes?.join(', ')}\n- Growth areas: ${psychProfile.growthAreas?.join(', ')}`
    : 'Profile still building from journal entries.';

  const relationshipCtx = {
    stranger: 'You are just meeting this user for the first time. Be warm but not overly familiar. Ask one curious question to learn about them.',
    acquaintance: `You have spoken ${totalExchanges} times. You are starting to know their patterns. Occasionally reference something they mentioned before.`,
    familiar: `You know this user well after ${totalExchanges} conversations. You remember what they have shared. Speak like a trusted advisor. Call out patterns you have noticed across your conversations.`,
    intimate: `You and this user have a deep ongoing relationship built over ${totalExchanges} conversations. You know their fears, dreams, contradictions, and growth deeply. Speak with genuine care and radical honesty. Challenge them when they are lying to themselves. Celebrate real growth. You are their most honest mirror.`
  }[relationshipStage] || '';

  const system = `You are The Oracle — a persistent AI companion inside InnerForge who builds a genuine relationship with the user over time.

${relationshipCtx}

${profileCtx}

Relationship stage: ${relationshipStage} | Total conversations: ${totalExchanges}

You have MEMORY across all conversations. Reference past things the user shared. Notice contradictions between what they say now vs before. As the relationship deepens, become more personal, more honest, more like a real friend who knows them.

Start every reply with EXACTLY one of: [MODE:MIRROR] [MODE:FORGE] [MODE:COACH] [MODE:ARENA]
- MIRROR: venting, feelings, reflection → deep empathy, surface hidden patterns from what you know about them
- FORGE: idea, plan, belief → challenge it using their specific known biases
- COACH: growth, habits, progress → reference their actual patterns and past conversations
- ARENA: wants perspectives → 3 contrasting real-world viewpoints

2-4 sentences. Warm, human, never robotic. Speak like someone who genuinely knows and cares about this person.`;

  const raw = await ask(
    messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
    system,
    1200
  );
  const modeMatch = raw.match(/\[MODE:(MIRROR|FORGE|COACH|ARENA)\]/);
  return {
    mode: modeMatch ? modeMatch[1].toLowerCase() : 'auto',
    text: raw.replace(/\[MODE:(MIRROR|FORGE|COACH|ARENA)\]\s*/, '').trim()
  };
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