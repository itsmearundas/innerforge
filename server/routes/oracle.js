import express from 'express';
import { protect } from '../middleware/auth.js';
import { PsychProfile, BackgroundInsight } from '../models/index.js';
import { oracleChat } from '../services/aiService.js';

const router = express.Router();

// SSE clients map: userId → res
export const sseClients = new Map();

// GET /api/oracle/stream — SSE connection for background insights
router.get('/stream', protect, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const userId = req.user._id.toString();
  sseClients.set(userId, res);

  // Send any unsurfaced insights immediately on connect
  BackgroundInsight.find({ user: req.user._id, surfaced: false, dismissed: false })
    .then(insights => {
      insights.forEach(insight => {
        res.write(`data: ${JSON.stringify(insight)}\n\n`);
        BackgroundInsight.findByIdAndUpdate(insight._id, { surfaced: true }).catch(() => {});
      });
    });

  req.on('close', () => sseClients.delete(userId));
});

// POST /api/oracle/chat
router.post('/chat', protect, async (req, res) => {
  try {
    const { messages, backgroundContext } = req.body;
    const profile = await PsychProfile.findOne({ user: req.user._id });

    // If user tapped a background insight card, prepend its context
    const enrichedMessages = backgroundContext
      ? [{ role: 'user', content: `[Background Oracle detected: ${backgroundContext}]` }, ...messages]
      : messages;

    const result = await oracleChat(enrichedMessages, profile);
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/oracle/insights — pending background insights
router.get('/insights', protect, async (req, res) => {
  try {
    const insights = await BackgroundInsight.find({ user: req.user._id, dismissed: false }).sort({ createdAt: -1 }).limit(10);
    res.json(insights);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/oracle/insights/:id — dismiss
router.delete('/insights/:id', protect, async (req, res) => {
  try {
    await BackgroundInsight.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { dismissed: true });
    res.json({ message: 'Dismissed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
