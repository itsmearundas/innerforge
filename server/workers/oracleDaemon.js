import { User, JournalEntry, PsychProfile, BackgroundInsight } from '../models/index.js';
import { detectBackgroundInsights } from '../services/aiService.js';
import { sseClients } from '../routes/oracle.js';

async function runDaemon() {
  try {
    const users = await User.find({ oracleEnabled: true });

    for (const user of users) {
      const entries = await JournalEntry.find({ user: user._id, 'aiInsights.analyzed': true })
        .sort({ createdAt: -1 }).limit(15);

      if (entries.length < 3) continue;

      // Don't spam — skip if insight generated in last 2 hours
      const recent = await BackgroundInsight.findOne({ user: user._id, createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } });
      if (recent) continue;

      const profile = await PsychProfile.findOne({ user: user._id });
      const insights = await detectBackgroundInsights(entries, profile);

      for (const insight of insights) {
        const doc = await BackgroundInsight.create({ user: user._id, ...insight });

        // Push via SSE if user has open connection
        const sseRes = sseClients.get(user._id.toString());
        if (sseRes) {
          sseRes.write(`data: ${JSON.stringify({ ...doc.toObject(), surfaced: true })}\n\n`);
          await BackgroundInsight.findByIdAndUpdate(doc._id, { surfaced: true });
        }
      }
    }
  } catch (err) {
    console.error('Oracle daemon error:', err.message);
  }
}

export function startOracleDaemon() {
  console.log('✓ Oracle background daemon started');
  // Run every 20 minutes
  runDaemon();
  setInterval(runDaemon, 20 * 60 * 1000);
}
