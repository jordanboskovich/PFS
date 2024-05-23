import mongoose from 'mongoose';

const MeetingLogSchema = new mongoose.Schema({
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  timesMet: { type: Number, required: true }
});

const MeetingLog = mongoose.models.MeetingLog || mongoose.model('MeetingLog', MeetingLogSchema);

export default MeetingLog;
