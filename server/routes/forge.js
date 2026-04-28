import express from 'express';
import { protect } from '../middleware/auth.js';
import { Idea, PsychProfile } from '../models/index.js';
import { stressTestIdea } from '../services/aiService.js';

const router = express.Router();
router.use(protect);

// POST /api/forge — submit idea for stress testing
router.post('/', async (req, res) => {
  try {
    const { title, content, isPublic } = req.body;
    const idea = await Idea.create({ user: req.user._id, title, content, isPublic: isPublic || false });
    res.status(201).json(idea);

    // Run stress test async
    const profile = await PsychProfile.findOne({ user: req.user._id });
    stressTestIdea({ title, content }, profile).then(async result => {
      await Idea.findByIdAndUpdate(idea._id, {
        attacks: result.attacks,
        steelMan: result.steelMan,
        overallScore: result.overallScore,
      });
    }).catch(console.error);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/forge — user's ideas
router.get('/', async (req, res) => {
  try {
    const ideas = await Idea.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(ideas);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/forge/public — community ideas
router.get('/public', async (req, res) => {
  try {
    const ideas = await Idea.find({ isPublic: true }).populate('user', 'name').sort({ upvotes: -1 }).limit(20);
    res.json(ideas);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/forge/:id — single idea (poll for results)
router.get('/:id', async (req, res) => {
  try {
    const idea = await Idea.findOne({ _id: req.params.id, user: req.user._id });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    res.json(idea);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/forge/:id/upvote
router.post('/:id/upvote', async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ message: 'Not found' });
    const alreadyVoted = idea.upvotedBy.includes(req.user._id);
    if (alreadyVoted) {
      idea.upvotedBy.pull(req.user._id);
      idea.upvotes = Math.max(0, idea.upvotes - 1);
    } else {
      idea.upvotedBy.push(req.user._id);
      idea.upvotes += 1;
    }
    await idea.save();
    res.json({ upvotes: idea.upvotes, voted: !alreadyVoted });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
