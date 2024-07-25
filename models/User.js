import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: 'mentor',
  },
  name: String,
  grade: Number,
  school: String,
  email: String,
  phone: String,
  gender: String,
  PFSEmail: String,
  parent1Name: String,
  parent1Email: String,
  parent1Cellphone: String,
  parent2Name: String,
  parent2Email: String,
  parent2Cellphone: String,
  homeAddress: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  mentee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  meetings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MeetingLog',
  }],
  timesMetThisMonth: {
    type: Number,
    default: 0,
  }
});


UserSchema.pre('save', async function (next) {
  if (this.isModified('password') || this.isNew) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

UserSchema.methods.comparePassword = function (password, callback) {
  bcrypt.compare(password, this.password, (err, isMatch) => {
    if (err) return callback(err);
    callback(null, isMatch);
  });
};

// Check if the model exists before compiling it
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;
