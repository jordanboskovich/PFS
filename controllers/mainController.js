// controllers/mainController.js
import User from '../models/User.js';
import MeetingLog from '../models/MeetingLog.js';
import Resource from '../models/Resource.js';

export const home = (req, res) => {
  if (req.user) {
    if (req.user.role === 'admin') {
      return res.redirect('/admin_home');
    }
    if (req.user.role === 'mentor') {
      return res.redirect('/mentor_home');
    }
  }
  res.render('index', { title: 'Welcome to PFS' });
};

export const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).send('Access denied');
};

export const isMentor = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'mentor') {
    return next();
  }
  res.status(403).send('Access denied');
};

export const admin_home = (req, res) => {
  res.render('admin_home');
};

export const admin_directory = async (req, res) => {
  try {
    const mentors = await User.find({ role: 'mentor' }).populate('mentee');
    const mentees = await User.find({ role: 'mentee' }).populate('mentor');
    res.render('admin_directory', { mentors, mentees });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};


export const admin_pair = async (req, res) => {
  try {
    const mentors = await User.find({ role: 'mentor' }).populate('mentee');
    const mentees = await User.find({ role: 'mentee' }).populate('mentor');
    console.log('Mentors:', mentors); // Log mentors data for debugging
    console.log('Mentees:', mentees); // Log mentees data for debugging
    res.render('admin_pair', { mentors, mentees });
  } catch (err) {
    console.error('Error in admin_pair:', err); // Log the error
    res.status(500).send('Server Error');
  }
};


export const mentor_home = (req, res) => {
  res.render('mentor_home');
};

export const mentor_profile = async (req, res) => {
  try {
    const mentor = await User.findById(req.user._id).populate('mentee');
    const mentee = mentor.mentee;
    res.render('mentor_profile', { mentor, mentee });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

export const logMeeting = async (req, res) => {
  try {
    const mentorId = req.user._id;
    const mentor = await User.findById(mentorId).populate('mentee');
    const menteeId = mentor.mentee._id;

    const newMeetingLog = new MeetingLog({
      mentor: mentorId,
      mentee: menteeId,
      timesMet: 1, // Increment by 1 each time
      date: new Date()
    });

    await newMeetingLog.save();
    mentor.meetings.push(newMeetingLog);
    mentor.timesMetThisMonth += 1;
    await mentor.save();

    res.redirect('/mentor/profile');
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

export const resetMeetings = async (req, res) => {
  try {
    await User.updateMany({ role: 'mentor' }, { $set: { timesMetThisMonth: 0 } });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};

export const pairStudents = async (req, res) => {
  try {
    const { mentorId, menteeId } = req.body;

    const mentor = await User.findById(mentorId);
    const mentee = await User.findById(menteeId);

    mentor.mentee = menteeId;
    mentee.mentor = mentorId;

    await mentor.save();
    await mentee.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};

export const unpairStudents = async (req, res) => {
  try {
    const { mentorId, menteeId } = req.body;

    const mentor = await User.findById(mentorId);
    const mentee = await User.findById(menteeId);

    if (mentor && mentee && mentor.mentee.toString() === menteeId && mentee.mentor.toString() === mentorId) {
      mentor.mentee = null;
      mentee.mentor = null;

      await mentor.save();
      await mentee.save();

      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Invalid pairing' });
    }
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};



// Add new mentor or mentee
export const addUser = async (req, res) => {
  try {
    const { username, password, role, name, grade, school, phone, email, gender } = req.body;
    const newUser = new User({
      username,
      password,
      role,
      name,
      grade,
      school,
      phone,
      email,
      gender
    });
    await newUser.save();
    res.redirect('/admin/directory');
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

export const getAddUser = (req, res) => {
  res.render('add_user');
};


export const mentor_resources = async (req, res) => {
  try {
    const resources = await Resource.find();
    res.render('mentor_resources', { resources });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};