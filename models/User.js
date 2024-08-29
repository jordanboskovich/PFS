import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// most fields in user schema are optional because mentors and mentees have different values
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    sparse: true, // Allows null and unique combination
  },
  password: {
    type: String,
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
  isAmbassador: {
    type: Boolean,
    default: false
  },
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
  },
  dateStarted: {
    type: Date,
    default: Date.now
  },
    dateEnded: Date,
  });

UserSchema.pre('save', async function (next) {
  if (this.isModified('password') || this.isNew) {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
  next();
});

UserSchema.methods.comparePassword = function (password, callback) {
  if (!this.password) {
    return callback(null, false);
  }
  bcrypt.compare(password, this.password, (err, isMatch) => {
    if (err) return callback(err);
    callback(null, isMatch);
  });
};

// Check if the model exists before compiling it
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;
