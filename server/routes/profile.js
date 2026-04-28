import express from 'express';
import { protect } from '../middleware/auth.js';
import { PsychProfile, JournalEntry } from '../models/index.js';
import { generateEvolutionNarrative } from '../services/aiService.js';

const router = express.Router();
router.use(protect);

// GET /api/profile — get user's psych profile
router.get('/', async (req, res) => {
  try {
    const profile = await PsychProfile.findOne({ user: req.user._id });
    const entryCount = await JournalEntry.countDocuments({ user: req.user._id });
    res.json({ profile, entryCount });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/profile/evolution — growth narrative + emotion timeline
router.get('/evolution', async (req, res) => {
  try {
    const profile = await PsychProfile.findOne({ user: req.user._id });
    const entries = await JournalEntry.find({ user: req.user._id, 'aiInsights.analyzed': true })
      .sort({ createdAt: 1 }).select('createdAt aiInsights.emotions aiInsights.biasesDetected mood');

    const narrative = profile?.profileHistory?.length >= 2
      ? await generateEvolutionNarrative(profile.profileHistory)
      : null;

    res.json({ profile, entries, narrative });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
