import User from '../models/User.js';
import MeetingLog from '../models/MeetingLog.js';
import Resource from '../models/Resource.js';
import Note from '../models/Note.js';
import nodemailer from 'nodemailer';
import multer from 'multer';
import xlsx from 'xlsx';
import { Parser } from 'json2csv';
import History from '../models/History.js';

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

export const isAmbassador = (req, res, next) => {
  if (req.user && req.user.isAmbassador) {
    return next();
  }
  return res.status(403).send('Access Denied');
};

export const admin_home = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id);
    res.render('admin_home', { admin }); 
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
      timesMet: 1,
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

    let generatedUsername = username;

    // If the user is a mentee, generate a username similar to the Excel upload logic
    if (role === 'mentee') {
      const randomString = Math.random().toString(36).substring(2, 10);
      const nameParts = name.split(' ');
      const firstName = nameParts[0].toLowerCase();
      const lastName = nameParts.length > 1 ? nameParts[1].toLowerCase() : 'unknown';
      generatedUsername = `${firstName}_${lastName}_${randomString}`;
    }

    console.log('Final Username:', generatedUsername); // Ensure the username is not null

    const newUser = new User({
      username: generatedUsername, // Always provide a username, even for mentees
      password: role === 'mentee' ? undefined : password, // Mentees might not need a password
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
      homeAddress,
      dateStarted: new Date()
    });

    console.log('New user object before saving:', newUser);

    // Saving the new user
    await newUser.save();

    console.log('User saved successfully');
    res.redirect('/admin/directory');
  } catch (err) {
    console.error('Error in addUser function:', err);
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

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your email address
      pass: process.env.EMAIL_PASS  // Your email password
    }
  });

  const recipients = [email];
  if (PFSEmail) {
    recipients.push(PFSEmail);
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipients, 
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
      const recipients = [mentor.email];
      if (mentor.PFSEmail) {
        recipients.push(mentor.PFSEmail);
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipients, 
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
    const mentorId = req.user._id; 
    const {
      username, name, gender, grade, school, phone, email, PFSEmail, parent1Name, parent1Email, parent1Cellphone, parent2Name, parent2Email, parent2Cellphone, homeAddress, spreadsheetLink
    } = req.body;

    await User.findByIdAndUpdate(mentorId, {
      username, name, gender, grade, school, phone, email, PFSEmail, parent1Name, parent1Email, parent1Cellphone, parent2Name, parent2Email, parent2Cellphone, homeAddress, spreadsheetLink
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
        parent2Cellphone: row['Par.2 Phone'],
        homeAddress: row['Address']
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
        parent2Cellphone: row['Par.2 Phone'],
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

// export mentors as a CSV file with the filters
export const exportMentors = async (req, res) => {
  try {
    const { grade, school, gender } = req.query;
    const query = { role: 'mentor' };

    if (grade) query.grade = grade;
    if (school) query.school = school;
    if (gender) query.gender = gender;

    const mentors = await User.find(query).populate('mentee').lean();

    const fields = ['name', 'gender', 'grade', 'school', 'phone', 'PFSEmail', 'email', 'parent1Name', 'parent1Email', 'parent1Cellphone', 'parent2Name', 'parent2Email', 'parent2Cellphone', 'timesMetThisMonth', 'homeAddress'];
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

export const exportPairs = async (req, res) => {
  try {
    const query = { role: 'mentor' };

    const mentors = await User.find(query).populate('mentee').lean();

    const mentorMenteePairs = mentors.map(mentor => ({
      mentorName: mentor.name,
      mentorSchool: mentor.school,
      mentorGrade: mentor.grade,
      mentorEmail: mentor.PFSEmail,
      mentorParent1Name: mentor.parent1Name ? mentor.parent1Name : 'N/A',
      mentorParent1Email: mentor.parent1Email ? mentor.parent1Email : 'N/A',
      mentorParent2Name: mentor.parent2Name ? mentor.parent2Name : 'N/A',
      mentorParent2Email: mentor.parent2Email ? mentor.parent2Email : 'N/A',
      menteeName: mentor.mentee?.name || 'N/A', 
      menteeSchool: mentor.mentee?.school || 'N/A',
      menteeGrade: mentor.mentee?.grade || 'N/A',
      menteeEmail: mentor.mentee?.PFSEmail || 'N/A',
      menteeParent1Name: mentor.mentee?.parent1Name ? mentor.mentee.parent1Name : 'N/A',
      menteeParent1Email: mentor.mentee?.parent1Email ? mentor.mentee.parent1Email : 'N/A',
      menteeParent2Name: mentor.mentee?.parent2Name ? mentor.mentee.parent2Name : 'N/A',
      menteeParent2Email: mentor.mentee?.parent2Email ? mentor.mentee.parent2Email : 'N/A'
    }));
    

    const fields = [
      'mentorName',
      'mentorSchool',
      'mentorGrade',
      'mentorEmail',
      'mentorParent1Name',
      'mentorParent1Email',
      'mentorParent2Name',
      'mentorParent2Email',
      'menteeName',
      'menteeSchool',
      'menteeGrade',
      'menteeEmail',
      'menteeParent1Name',
      'menteeParent1Email',
      'menteeParent2Name',
      'menteeParent2Email',
    ];

    const opts = { fields };

    const parser = new Parser(opts);
    const csv = parser.parse(mentorMenteePairs);

    res.header('Content-Type', 'text/csv');
    res.attachment('mentor_mentee_pairs.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};


// export mentees as a CSV with the filters
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

// get the current users from Users in database and past users from History in database
export const admin_history = async (req, res) => {
  try {
    const currentMentors = await User.find({ role: 'mentor' }).sort({ dateStarted: -1 });
    const currentMentees = await User.find({ role: 'mentee' }).sort({ dateStarted: -1 });
    const pastUsers = await History.find().sort({ dateStarted: -1 });

    const pastMentors = pastUsers.filter(user => user.role === 'mentor');
    const pastMentees = pastUsers.filter(user => user.role === 'mentee');

    res.render('admin_history', { currentMentors, currentMentees, pastMentors, pastMentees });
  } catch (err) {
    console.error("Error fetching history data: ", err);
    res.status(500).send('Server Error');
  }
};

// Function to delete a mentor
export const delete_mentor = async (req, res) => {
  try {
    const mentor = await User.findById(req.params.id);
    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }

    // Save to history before deleting
    const historyEntry = new History({
      name: mentor.name,
      email: mentor.email,
      role: mentor.role,
      dateStarted: mentor.dateStarted,
      dateEnded: new Date()
    });

    await historyEntry.save();
    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting mentor: ", err);
    res.status(500).send('Server Error');
  }
};

// Function to delete a mentee
export const delete_mentee = async (req, res) => {
  try {
    const mentee = await User.findById(req.params.id);
    if (!mentee) {
      return res.status(404).json({ success: false, message: 'Mentee not found' });
    }

    // Save to history before deleting
    const historyEntry = new History({
      name: mentee.name,
      email: mentee.email,
      role: mentee.role,
      dateStarted: mentee.dateStarted,
      dateEnded: new Date()
    });

    await historyEntry.save();
    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting mentee: ", err);
    res.status(500).send('Server Error');
  }
};

// Display form to add a new admin
export const getAddAdmin = async (req, res) => {
  try {
      const admins = await User.find({ role: 'admin' }); // Fetch all users with the role of 'admin'
      res.render('add_admin', { admins }); // Pass the admins to the EJS template
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
};
// Handle the form submission to add a new admin
export const addAdmin = async (req, res) => {
  try {
    const { username, name, password, email } = req.body;

    // Create a new admin user
    const newAdmin = new User({
      username,
      name,
      password,
      email,
      role: 'admin',
      dateStarted: new Date()
    });

    await newAdmin.save();
    res.redirect('/admin_home');
  } catch (err) {
    console.error('Error adding admin:', err);
    res.status(500).send('Server Error');
  }
};

export const promoteGrade = async (req, res) => {
  try {
    // Update grades for all mentors and mentees
    await User.updateMany({ role: { $in: ['mentor', 'mentee'] } }, { $inc: { grade: 1 } });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server Error' });
  }
};

export const makeAmbassador = async (req, res) => {
  try {
    const mentorId = req.params.id;
    await User.findByIdAndUpdate(mentorId, { isAmbassador: true });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server Error' });
  }
};

export const demoteAmbassador = async (req, res) => {
  try {
    const mentorId = req.params.id;
    await User.findByIdAndUpdate(mentorId, { isAmbassador: false });
    res.status(200).send('Mentor demoted successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error demoting mentor');
  }
};

export const updateMentee = async (req, res) => {
  try {
    const menteeId = req.params.id;
    const updatedData = {
      name: req.body.name,
      gender: req.body.gender,
      grade: req.body.grade,
      school: req.body.school,
      PFSEmail: req.body.PFSEmail,
      parent1Name: req.body.parent1Name,
      parent1Email: req.body.parent1Email,
      parent1Cellphone: req.body.parent1Cellphone,
      parent2Name: req.body.parent2Name,
      parent2Email: req.body.parent2Email,
      parent2Cellphone: req.body.parent2Cellphone,
      homeAddress: req.body.homeAddress
    };

    await User.findByIdAndUpdate(menteeId, updatedData);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server Error' });
  }
};

export const updateMentor = async (req, res) => {
  try {
    const mentorId = req.params.id;
    const updatedData = {
      username: req.body.username,
      name: req.body.name,
      gender: req.body.gender,
      grade: req.body.grade,
      school: req.body.school,
      email: req.body.email,
      phone: req.body.phone,
      PFSEmail: req.body.PFSEmail,
      parent1Name: req.body.parent1Name,
      parent1Email: req.body.parent1Email,
      parent1Cellphone: req.body.parent1Cellphone,
      parent2Name: req.body.parent2Name,
      parent2Email: req.body.parent2Email,
      parent2Cellphone: req.body.parent2Cellphone,
      homeAddress: req.body.homeAddress,
      spreadsheetLink: req.body.spreadsheetLink,
    };

    await User.findByIdAndUpdate(mentorId, updatedData);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server Error' });
  }
};



export const clearNotes = async (req, res) => {
  try {
    await Note.deleteMany({});
    res.json({ success: true });
  } catch (error) {
    console.error("Error clearing notes:", error);
    res.json({ success: false });
  }
};