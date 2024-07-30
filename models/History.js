import mongoose from 'mongoose';

const HistorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
  },
  role: {
    type: String,
    required: true
  },
  dateStarted: {
    type: Date,
    required: true
  },
  dateEnded: {
    type: Date,
    required: true
  }
});

const History = mongoose.model('History', HistorySchema);

export default History;
