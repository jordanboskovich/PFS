import express from 'express';
import passport from 'passport';
import * as ctrl from '../controllers/mainController.js';
import * as auth from '../controllers/authController.js';
import * as resourceCtrl from '../controllers/resourceController.js';

const router = express.Router();

// Home page route
router.get('/', ctrl.home);

// Admin specific routes
router.get('/admin_home', ctrl.isAdmin, ctrl.admin_home);
router.get('/admin/directory', ctrl.isAdmin, ctrl.admin_directory);

router.get('/admin/pair', ctrl.isAdmin, ctrl.admin_pair);
router.post('/admin/pair', ctrl.isAdmin, ctrl.pairStudents);
router.post('/admin/unpair', ctrl.isAdmin, ctrl.unpairStudents);

router.get('/admin/resources', ctrl.isAdmin, resourceCtrl.getResources);
router.post('/admin/resources/add', ctrl.isAdmin, resourceCtrl.addResource);
router.post('/admin/resources/delete/:id', ctrl.isAdmin, resourceCtrl.deleteResource);
router.get('/admin/addUser', ctrl.isAdmin, ctrl.getAddUser);
router.post('/admin/addUser', ctrl.isAdmin, ctrl.addUser);

router.post('/admin/resetMeetings', ctrl.isAdmin, ctrl.resetMeetings);

// Mentor specific routes
router.get('/mentor_home', ctrl.isMentor, ctrl.mentor_home);
router.get('/mentor/resources', ctrl.isMentor, ctrl.mentor_resources);
router.get('/mentor/profile', ctrl.isMentor, ctrl.mentor_profile);
router.post('/mentor/logMeeting', ctrl.isMentor, ctrl.logMeeting);

// Authentication routes
router.get('/login', auth.login);
router.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: false
}));
router.get('/logout', auth.logout);

// forgot password routes
router.get('/forgot-password', auth.forgotPassword);
router.post('/forgot-password', auth.handleForgotPassword);
router.get('/reset-password/:token', auth.resetPassword);
router.post('/reset-password/:token', auth.handleResetPassword);

// // Registration routes
// router.get('/register', auth.register);
// router.post('/register', auth.verifyRegister);

router.post('/mentor/addNote', ctrl.isMentor, ctrl.addNote);
router.get('/admin/notes', ctrl.isAdmin, ctrl.admin_notes);

router.post('/admin/sendReminder', ctrl.isAdmin, ctrl.sendReminderEmail);
router.post('/admin/sendBulkReminders', ctrl.isAdmin, ctrl.sendBulkReminders);

router.post('/mentor/updateProfile', ctrl.updateMentorProfile);

router.get('/reset-password-success', ctrl.resetPasswordSuccess);


export default router;
