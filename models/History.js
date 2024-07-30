import mongoose from 'mongoose';

// this is for mentors and mentees that have been deleted but need to be stored in the history page
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
