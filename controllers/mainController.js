// controllers/mainController.js
import User from '../models/User.js';
import MeetingLog from '../models/MeetingLog.js';
import Resource from '../models/Resource.js';
import Note from '../models/Note.js';
import nodemailer from 'nodemailer';
import multer from 'multer';
import xlsx from 'xlsx';
import { Parser } from 'json2csv';

// Function to add a note
export const addNote = async (req, res) => {
  try {
    const { date, content } = req.body;
    const mentorId = req.user._id;

    const newNote = new Note({
      mentor: mentorId,
      date,
      content,
    });

    await newNote.save();

    res.redirect('/mentor/profile');
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// Function to view notes
export const admin_notes = async (req, res) => {
  try {
    const notes = await Note.find().populate('mentor');
    res.render('admin_notes', { notes });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

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

export const admin_home = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id);
    res.render('admin_home', { admin }); // Pass admin object to the template
  } catch (err) {
    res.status(500).send('Server Error');
  }
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
    res.render('admin_pair', { mentors, mentees });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

export const mentor_home = async (req, res) => {
  try {
    const mentor = await User.findById(req.user._id);
    res.render('mentor_home', { mentor });
  } catch (err) {
    res.status(500).send('Server Error');
  }
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

    if (mentor && mentee && mentor.mentee && mentor.mentee.toString() === menteeId && mentee.mentor && mentee.mentor.toString() === mentorId) {
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
    const {
      username, password, role, name, gender, grade, school, phone,
      PFSEmail, email, parent1Name, parent1Email, parent1Cellphone,
      parent2Name, parent2Email, parent2Cellphone, homeAddress
    } = req.body;

    const newUser = new User({
      username: role === 'mentee' ? undefined : username,
      password: role === 'mentee' ? undefined : password,
      role,
      name,
      gender,
      grade,
      school,
      phone,
      PFSEmail,
      email,
      parent1Name,
      parent1Email,
      parent1Cellphone,
      parent2Name,
      parent2Email,
      parent2Cellphone,
      homeAddress
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

export const sendReminderEmail = async (req, res) => {
  const { email, PFSEmail } = req.body;

  // Configure the mail transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your email address
      pass: process.env.EMAIL_PASS  // Your email password
    }
  });

  // Prepare the recipient emails
  const recipients = [email];
  if (PFSEmail) {
    recipients.push(PFSEmail);
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipients, // Send to both emails if PFSEmail exists
    subject: 'Reminder to Meet with Your Mentee',
    text: 'This is a reminder to schedule a meeting with your mentee before the end of the month.'
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    console.error('Error sending email:', err);
    res.json({ success: false, error: err.message });
  }
};

export const sendBulkReminders = async (req, res) => {
  // Configure the mail transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your email address
      pass: process.env.EMAIL_PASS  // Your app-specific password
    }
  });

  try {
    const mentors = await User.find({ role: 'mentor', timesMetThisMonth: 0 });

    const emailPromises = mentors.map(mentor => {
      // Prepare the recipient emails
      const recipients = [mentor.email];
      if (mentor.PFSEmail) {
        recipients.push(mentor.PFSEmail);
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipients, // Send to both emails if PFSEmail exists
        subject: 'Reminder to Meet with Your Mentee',
        text: 'This is a reminder to schedule a meeting with your mentee.'
      };

      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);

    res.json({ success: true });
  } catch (err) {
    console.error('Error sending bulk emails:', err);
    res.json({ success: false, error: err.message });
  }
};

export const updateMentorProfile = async (req, res) => {
  try {
    const mentorId = req.user._id; // Assuming the mentor's ID is stored in req.user._id
    const {
      name, gender, grade, school, phone, email, PFSEmail, parent1Name, parent1Email, parent1Cellphone, parent2Name, parent2Email, parent2Cellphone, homeAddress
    } = req.body;

    await User.findByIdAndUpdate(mentorId, {
      name, gender, grade, school, phone, email, PFSEmail, parent1Name, parent1Email, parent1Cellphone, parent2Name, parent2Email, parent2Cellphone, homeAddress
    });

    res.redirect('/mentor/profile');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

export const resetPasswordSuccess = (req, res) => {
  res.render('reset-password-success', { title: 'Password Reset Successful' });
};


const upload = multer({ dest: 'uploads/' });

export const uploadMentors = async (req, res) => {
  try {
    const file = req.file;
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const mentorData = xlsx.utils.sheet_to_json(sheet);

    for (const row of mentorData) {
      let username = `${row['First Name'].toLowerCase()}_${row['Last Name'].toLowerCase()}`;
      let existingUser = await User.findOne({ username });
      let counter = 1;
      
      while (existingUser) {
        username = `${row['First Name'].toLowerCase()}_${row['Last Name'].toLowerCase()}_${counter}`;
        existingUser = await User.findOne({ username });
        counter++;
      }

      const newMentor = new User({
        username,
        password: row['Password'],
        role: 'mentor',
        name: `${row['First Name']} ${row['Last Name']}`,
        gender: row['Gender'],
        grade: row['Grade'],
        school: row['School'],
        phone: row['Phone'],
        PFSEmail: row['PFS Email'],
        email: row['Other Email'],
        parent1Name: row['Par.1 Name'],
        parent1Email: row['Par.1 Email'],
        parent1Cellphone: row['Par.1 Phone'],
        parent2Name: row['Par.2 Name'],
        parent2Email: row['Par.2 Email'],
        parent2Cellphone: row['Par. Phone']
      });

      await newMentor.save();
    }

    res.redirect('/admin/directory');
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

export const uploadMentees = async (req, res) => {
  try {
    console.log('Mentee upload started');
    const file = req.file;
    console.log('File uploaded:', file);

    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const menteeData = xlsx.utils.sheet_to_json(sheet);
    console.log('Mentee data:', menteeData);

    // generates a random username for mentees because the database isn't allowing the creation of users without one
    for (const row of menteeData) {
      const randomString = Math.random().toString(36).substring(2, 10);
      const username = `${row['First Name'].toLowerCase()}_${row['Last Name'].toLowerCase()}_${randomString}`;

      const newMentee = new User({
        username: username,
        role: 'mentee',
        name: `${row['First Name']} ${row['Last Name']}`,
        gender: row['Gender'],
        grade: row['Grade'],
        school: row['School'],
        PFSEmail: row['PFS Email'],
        email: row['Other Email'],
        parent1Name: row['Par.1 Name'],
        parent1Email: row['Par.1 Email'],
        parent1Cellphone: row['Par.1 Phone'],
        parent2Name: row['Par.2 Name'],
        parent2Email: row['Par.2 Email'],
        parent2Cellphone: row['Par. Phone'],
        homeAddress: row['Address']
      });

      await newMentee.save();
    }

    console.log('Mentees successfully uploaded');
    res.redirect('/admin/directory');
  } catch (err) {
    console.error('Error uploading mentees:', err);
    res.status(500).send('Server Error');
  }
};

export const exportMentors = async (req, res) => {
  try {
    const { grade, school, gender } = req.query;
    const query = { role: 'mentor' };

    if (grade) query.grade = grade;
    if (school) query.school = school;
    if (gender) query.gender = gender;

    const mentors = await User.find(query).populate('mentee').lean();

    const fields = ['name', 'gender', 'grade', 'school', 'phone', 'PFSEmail', 'email', 'parent1Name', 'parent1Email', 'parent1Cellphone', 'parent2Name', 'parent2Email', 'parent2Cellphone'];
    const opts = { fields };

    const parser = new Parser(opts);
    const csv = parser.parse(mentors);

    res.header('Content-Type', 'text/csv');
    res.attachment('mentors.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

export const exportMentees = async (req, res) => {
  try {
    const { grade, school, gender } = req.query;
    const query = { role: 'mentee' };

    if (grade) query.grade = grade;
    if (school) query.school = school;
    if (gender) query.gender = gender;

    const mentees = await User.find(query).populate('mentor').lean();

    const fields = ['name', 'gender', 'grade', 'school', 'PFSEmail', 'email', 'parent1Name', 'parent1Email', 'parent1Cellphone', 'parent2Name', 'parent2Email', 'parent2Cellphone', 'homeAddress'];
    const opts = { fields };

    const parser = new Parser(opts);
    const csv = parser.parse(mentees);

    res.header('Content-Type', 'text/csv');
    res.attachment('mentees.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};