//question: I want to redirect to mentor or admin based on what their "role" is in the Schema. Do I add that here or should I do something in my routes/ maincontroller, like a "isAdmin" function?

// Importing required modules and dependencies
import User from '../models/User.js';
import passport from 'passport';

// Controller function to render login page
export const login = (req, res) => {
  res.render('login');
}

// Middleware to authenticate login credentials
export const verifyLogin = passport.authenticate('local', { 
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: false 
});

// Controller function to render register page
export const register = (req, res) => {
  res.render('register');
}

// Middleware to verify and register a new user
export const verifyRegister = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = new User({ username, password });
    await user.save();
    res.redirect('/login');
  } catch (error) {
    res.send(error.message);
  }
};

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
    // Extract user ID from the request body
    const { userId } = req.body;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      // If no user is found, send a 404 response
      return res.status(404).send('User not found');
    }

    // Toggle user role
    user.role = user.role === 'admin' ? 'user' : 'admin';

    // Save the updated user
    await user.save();

    // Respond with the updated user information
    res.redirect("/");
  } catch (error) {
    // If an error occurs, send a 500 response with the error message
    res.status(500).send(error.message);
  }
};

// Controller function to logout user
export const logout = (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    // Redirect or respond after successful logout
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
  // If the user is not an admin, redirect them or show an error
  res.status(403).send('Access denied');
}
