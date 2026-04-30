import express from 'express';
import { protect } from '../middleware/auth.js';
import { PsychProfile, BackgroundInsight, OracleConversation } from '../models/index.js';
import { oracleChat } from '../services/aiService.js';

const router = express.Router();

// SSE clients map
export const sseClients = new Map();

// helper — determine relationship stage from exchange count
function getRelationshipStage(count) {
  if (count < 5) return 'stranger';
  if (count < 20) return 'acquaintance';
  if (count < 50) return 'familiar';
  return 'intimate';
}

// GET /api/oracle/stream — SSE for background insights
router.get('/stream', protect, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const userId = req.user._id.toString();
  sseClients.set(userId, res);

  BackgroundInsight.find({ user: req.user._id, surfaced: false, dismissed: false })
    .then(insights => {
      insights.forEach(insight => {
        res.write(`data: ${JSON.stringify(insight)}\n\n`);
        BackgroundInsight.findByIdAndUpdate(insight._id, { surfaced: true }).catch(() => {});
      });
    });

  req.on('close', () => sseClients.delete(userId));
});

// GET /api/oracle/history — load full conversation history
router.get('/history', protect, async (req, res) => {
  try {
    const convo = await OracleConversation.findOne({ user: req.user._id });
    if (!convo) return res.json({ messages: [], totalExchanges: 0, relationshipStage: 'stranger' });
    res.json({
      messages: convo.messages.slice(-100), // last 100 messages
      totalExchanges: convo.totalExchanges,
      relationshipStage: convo.relationshipStage,
      lastActive: convo.lastActive
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/oracle/chat
router.post('/chat', protect, async (req, res) => {
  try {
    const { message, backgroundContext } = req.body;
    const profile = await PsychProfile.findOne({ user: req.user._id });

    // Load full conversation history from DB
    let convo = await OracleConversation.findOne({ user: req.user._id });
    if (!convo) {
      convo = await OracleConversation.create({ user: req.user._id, messages: [] });
    }

    // Build context: last 20 messages for API call
    const historyForAI = convo.messages.slice(-20).map(m => ({
      role: m.role,
      content: m.content
    }));

    // Add current message
    const userMsg = { role: 'user', content: backgroundContext ? `[Context: ${backgroundContext}]\n${message}` : message };
    historyForAI.push(userMsg);

    // Call AI with full relationship context
    const result = await oracleChat(
      historyForAI,
      profile,
      convo.relationshipStage,
      convo.totalExchanges
    );

    // Save both messages to DB
    const newExchanges = convo.totalExchanges + 1;
    const newStage = getRelationshipStage(newExchanges);

    await OracleConversation.findByIdAndUpdate(convo._id, {
      $push: {
        messages: {
          $each: [
            { role: 'user', content: message, mode: 'auto', timestamp: new Date() },
            { role: 'ai', content: result.text, mode: result.mode, timestamp: new Date() }
          ]
        }
      },
      totalExchanges: newExchanges,
      relationshipStage: newStage,
      lastActive: new Date()
    });

    res.json({ ...result, totalExchanges: newExchanges, relationshipStage: newStage });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/oracle/insights
router.get('/insights', protect, async (req, res) => {
  try {
    const insights = await BackgroundInsight.find({ user: req.user._id, dismissed: false }).sort({ createdAt: -1 }).limit(10);
    res.json(insights);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/oracle/insights/:id
router.delete('/insights/:id', protect, async (req, res) => {
  try {
    await BackgroundInsight.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { dismissed: true });
    res.json({ message: 'Dismissed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/oracle/history — clear conversation (fresh start)
router.delete('/history', protect, async (req, res) => {
  try {
    await OracleConversation.findOneAndUpdate(
      { user: req.user._id },
      { messages: [], totalExchanges: 0, relationshipStage: 'stranger' }
    );
    res.json({ message: 'Conversation cleared' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;