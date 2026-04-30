import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ── USER ──────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String },
  googleId: String,
  avatar: String,
  oracleEnabled: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function(pass) {
  return bcrypt.compare(pass, this.password);
};

// ── JOURNAL ENTRY ─────────────────────────────────────────────
const journalEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  contentText: String, // plain text version for AI
  wordCount: { type: Number, default: 0 },
  aiInsights: {
    emotions: [String],
    themes: [String],
    biasesDetected: [{ name: String, severity: Number, explanation: String }],
    keyPhrases: [String],
    summary: String,
    analyzed: { type: Boolean, default: false },
  },
  mood: { type: Number, min: 1, max: 10 },
}, { timestamps: true });

// ── PSYCH PROFILE ─────────────────────────────────────────────
const psychProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  coreValues: [String],
  topBiases: [{
    name: String,
    strength: { type: Number, min: 0, max: 100 },
    firstDetected: Date,
    frequency: Number,
    description: String,
  }],
  recurringFears: [String],
  recurringThemes: [String],
  decisionPattern: String,
  emotionBaseline: String,
  growthAreas: [String],
  profileHistory: [{
    snapshot: Object,
    takenAt: { type: Date, default: Date.now }
  }],
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

// ── IDEA (FORGE) ──────────────────────────────────────────────
const ideaSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  attacks: [{
    angle: String,
    argument: String,
    severity: { type: Number, min: 1, max: 10 },
    isPersonalized: { type: Boolean, default: false },
  }],
  steelMan: String,
  overallScore: { type: Number, min: 0, max: 100 },
  isPublic: { type: Boolean, default: false },
  upvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// ── BACKGROUND INSIGHT ────────────────────────────────────────
const backgroundInsightSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mode: { type: String, enum: ['mirror', 'forge', 'coach', 'arena'], required: true },
  title: String,
  text: String,
  cta: String,
  context: String, // injected into Oracle system prompt when card is tapped
  surfaced: { type: Boolean, default: false },
  dismissed: { type: Boolean, default: false },
}, { timestamps: true });

// ── ARENA DEBATE ──────────────────────────────────────────────
const debateSchema = new mongoose.Schema({
  idea: { type: mongoose.Schema.Types.ObjectId, ref: 'Idea' },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    side: { type: String, enum: ['for', 'against', 'neutral'] },
    timestamp: { type: Date, default: Date.now },
  }],
  status: { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting' },
  roomCode: { type: String, unique: true },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);
export const PsychProfile = mongoose.model('PsychProfile', psychProfileSchema);
export const Idea = mongoose.model('Idea', ideaSchema);
export const BackgroundInsight = mongoose.model('BackgroundInsight', backgroundInsightSchema);
export const Debate = mongoose.model('Debate', debateSchema);

// ── ORACLE CONVERSATION ───────────────────────────────────────
const oracleMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'ai'], required: true },
  content: { type: String, required: true },
  mode: { type: String, enum: ['mirror', 'forge', 'coach', 'arena', 'auto'], default: 'auto' },
  timestamp: { type: Date, default: Date.now }
});

const oracleConversationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  messages: [oracleMessageSchema],
  totalExchanges: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  relationshipStage: { 
    type: String, 
    enum: ['stranger', 'acquaintance', 'familiar', 'intimate'], 
    default: 'stranger' 
  },
}, { timestamps: true });

export const OracleConversation = mongoose.model('OracleConversation', oracleConversationSchema);