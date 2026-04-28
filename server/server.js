import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import journalRoutes from './routes/journal.js';
import forgeRoutes from './routes/forge.js';
import oracleRoutes from './routes/oracle.js';
import arenaRoutes from './routes/arena.js';
import profileRoutes from './routes/profile.js';
import { setupArenaSocket } from './routes/arena.js';
import { startOracleDaemon } from './workers/oracleDaemon.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/forge', forgeRoutes);
app.use('/api/oracle', oracleRoutes);
app.use('/api/arena', arenaRoutes);
app.use('/api/profile', profileRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

setupArenaSocket(io);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✓ MongoDB connected');
    httpServer.listen(process.env.PORT || 5000, () => {
      console.log(`✓ Server running on port ${process.env.PORT || 5000}`);
      startOracleDaemon();
    });
  })
  .catch(err => { console.error('MongoDB error:', err); process.exit(1); });

export { io };