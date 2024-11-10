const express = require("express");
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require("passport");


//signUp route
router.get('/signup',userController.signUpPage);
router.post('/signup', userController.signUp);
router.post('/verify-otp', userController.verifyOtp);
router.post('/resend-otp', userController.resendOtp);
router.get('/auth/google',passport.authenticate('google', {scope:['profile','email']}));
router.get('/auth/google/callback', passport.authenticate('google', {failureRedirect: '/signup'}), (req, res) => {
    res.redirect('/');
})

//login route
router.get('/login', userController.loginPage);
router.post('/login', userController.login);















//home route
router.get('/',userController.loadHomePage);

//pageNotFound
router.get('/pageNotFound',userController.pageNotFound);


module.exports = router;