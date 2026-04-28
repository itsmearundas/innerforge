import express from 'express';
import { protect } from '../middleware/auth.js';
import { JournalEntry, PsychProfile } from '../models/index.js';
import { analyzeJournalEntry, buildPsychProfile } from '../services/aiService.js';

const router = express.Router();
router.use(protect);

// GET /api/journal — get all entries
router.get('/', async (req, res) => {
  try {
    const entries = await JournalEntry.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json(entries);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/journal — create entry + trigger AI analysis
router.post('/', async (req, res) => {
  try {
    const { content, contentText, wordCount, mood } = req.body;
    const entry = await JournalEntry.create({
      user: req.user._id, content, contentText, wordCount: wordCount || 0, mood
    });
    res.status(201).json(entry);

    // AI analysis runs async — don't block response
    analyzeJournalEntry(contentText || content).then(async insights => {
      await JournalEntry.findByIdAndUpdate(entry._id, {
        'aiInsights.emotions': insights.emotions,
        'aiInsights.themes': insights.themes,
        'aiInsights.biasesDetected': insights.biasesDetected,
        'aiInsights.keyPhrases': insights.keyPhrases,
        'aiInsights.summary': insights.summary,
        'aiInsights.analyzed': true,
      });
      // Rebuild psych profile after every 3 entries
      const count = await JournalEntry.countDocuments({ user: req.user._id, 'aiInsights.analyzed': true });
      if (count % 3 === 0) {
        const entries = await JournalEntry.find({ user: req.user._id, 'aiInsights.analyzed': true }).sort({ createdAt: -1 }).limit(30);
        const existing = await PsychProfile.findOne({ user: req.user._id });
        const newProfile = await buildPsychProfile(entries, existing);
        if (newProfile) {
          const snapshot = { ...newProfile };
          await PsychProfile.findOneAndUpdate(
            { user: req.user._id },
            { ...newProfile, lastUpdated: new Date(), $push: { profileHistory: { snapshot, takenAt: new Date() } } },
            { upsert: true, new: true }
          );
        }
      }
    }).catch(console.error);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/journal/:id
router.get('/:id', async (req, res) => {
  try {
    const entry = await JournalEntry.findOne({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json(entry);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/journal/:id
router.delete('/:id', async (req, res) => {
  try {
    await JournalEntry.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
