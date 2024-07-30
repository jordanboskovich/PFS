import User from '../models/User.js';
import passport from 'passport';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export const login = (req, res) => {
  res.render('login');
}

// Middleware to authenticate login credentials
export const verifyLogin = passport.authenticate('local', { 
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: false 
});

// Controller function to render change password page
export const changePassword = (req, res) => {
  res.render('changePassword', {user: req.user});
}

// Middleware to update user password
export const updatePassword = async (req, res) => {
  try {
    const { username, currPassword, newPassword1, newPassword2 } = req.body;
    if (newPassword1 !== newPassword2) {
      res.send("New passwords don't match.");
      return;
    }
    const user = await User.findOne({ username });
    if (!user) {
      res.send("User not found.");
      return;
    }

    // Use comparePassword method here
    user.comparePassword(currPassword, async (err, isMatch) => {
      if (err) {
        res.send("An error occurred.");
        return;
      }
      if (!isMatch) {
        res.send("Current password is incorrect.");
        return;
      }
      
      // If the current password is correct, proceed to update the password
      user.password = newPassword1; // This will be hashed automatically before saving due to the pre-save middleware
      await user.save();
      console.log('Password updated');
      res.redirect('/logout');
    });
  } catch (error) {
    res.send(error.message);
  }
};

// Controller function to toggle user role
export const toggleUserRole = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();
    res.redirect("/");
  } catch (error) {
    res.status(500).send(error.message);
  }
};

// Controller function to logout user
export const logout = (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
}                        

// Middleware to check if the user is authenticated
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

// Middleware to check for admin role
export const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).send('Access denied');
}

// Controller function to render forgot password page
export const forgotPassword = (req, res) => {
  res.render('forgot-password');
}

// Controller function to handle forgot password request
export const handleForgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).send('No account with that email address exists.');
  }

  const token = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

  await user.save();

  // Send email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    to: user.email,
    from: process.env.EMAIL_USER,
    subject: 'PFS Password Reset',
    text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
      Please click on the following link, or paste this into your browser to complete the process:\n\n
      http://${req.headers.host}/reset-password/${token}\n\n
      If you did not request this, please ignore this email and your password will remain unchanged.\n`
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      return res.status(500).send('Error sending email');
    }
    res.send('An e-mail has been sent to ' + user.email + ' with further instructions.');
  });
}

// Controller function to render reset password page
export const resetPassword = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).send('Password reset token is invalid or has expired.');
  }

  res.render('reset-password', { token: req.params.token, error: null });
}

// Controller function to handle reset password request
export const handleResetPassword = async (req, res) => {
  const { password, confirmPassword } = req.body;
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).send('Password reset token is invalid or has expired.');
  }

  if (password !== confirmPassword) {
    return res.render('reset-password', { token: req.params.token, error: 'Passwords do not match.' });
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  res.redirect('/reset-password-success');
}