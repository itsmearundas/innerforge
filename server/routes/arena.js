import express from 'express';
import { protect } from '../middleware/auth.js';
import { Debate, Idea } from '../models/index.js';

const router = express.Router();
router.use(protect);

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// POST /api/arena/create — create debate room
router.post('/create', async (req, res) => {
  try {
    const { ideaId } = req.body;
    const idea = await Idea.findOne({ _id: ideaId, user: req.user._id });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    const debate = await Debate.create({
      idea: ideaId, host: req.user._id, participants: [req.user._id],
      roomCode: makeRoomCode(), status: 'waiting'
    });
    res.status(201).json(debate);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/arena/join
router.post('/join', async (req, res) => {
  try {
    const { roomCode } = req.body;
    const debate = await Debate.findOne({ roomCode, status: { $ne: 'ended' } }).populate('idea').populate('host', 'name');
    if (!debate) return res.status(404).json({ message: 'Room not found' });
    if (!debate.participants.includes(req.user._id)) {
      debate.participants.push(req.user._id);
      await debate.save();
    }
    res.json(debate);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/arena/:id
router.get('/:id', async (req, res) => {
  try {
    const debate = await Debate.findById(req.params.id).populate('idea').populate('participants', 'name');
    res.json(debate);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;

// ── SOCKET.IO SETUP ───────────────────────────────────────────
export function setupArenaSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join_room', ({ roomCode, user }) => {
      socket.join(roomCode);
      socket.to(roomCode).emit('user_joined', { name: user.name });
    });

    socket.on('debate_message', async ({ roomCode, message, userId, userName, side }) => {
      const msg = { user: userId, userName, text: message, side, timestamp: new Date() };
      io.to(roomCode).emit('new_message', msg);
      await Debate.findOneAndUpdate({ roomCode }, { $push: { messages: msg }, status: 'active' });
    });

    socket.on('end_debate', ({ roomCode }) => {
      io.to(roomCode).emit('debate_ended');
      Debate.findOneAndUpdate({ roomCode }, { status: 'ended' }).catch(() => {});
    });

    socket.on('disconnect', () => {});
  });
}
