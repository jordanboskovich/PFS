import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
});

const Note = mongoose.model('Note', noteSchema);

export default Note;
