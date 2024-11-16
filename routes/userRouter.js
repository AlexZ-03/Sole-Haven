const express = require("express");
const router = express.Router();
const userController = require('../controllers/user/userController');
const profileController = require('../controllers/user/profileController');
const passport = require("passport");
const { userAuth, setUser } = require('../middlewares/auth');
const Product = require("../models/productSchema");


//signUp route
router.get('/signup',userController.signUpPage);
router.post('/signup', userController.signUp);
router.post('/verify-otp', userController.verifyOtp);
router.post('/resend-otp', userController.resendOtp);
router.get('/auth/google',passport.authenticate('google', {scope:['profile','email']}));
router.get('/auth/google/callback', passport.authenticate('google', {failureRedirect: '/signup'}), (req, res) => {
        req.session.user = { 
            _id: req.user._id, 
            name: req.user.name, 
            email: req.user.email 
        };
    res.redirect('/');
})

//login route
router.get('/login', userController.loginPage);
router.post('/login', userController.login);

//home route
router.get('/',userController.loadHomePage);
router.get('/logout', userController.logout);

//Profile routes
router.get('/userProfile', userAuth, profileController.userProfile)
router.get('/orders', userAuth, profileController.getOrders);


//Product management
router.get('/productDetails',userAuth, userController.getProductPage);
router.post('/profileEdit', userAuth, profileController.editProfile);
router.get('/manageAddress', userAuth, profileController.getAddressPage);
router.post('/addAddress', userAuth, profileController.addAddress);











//pageNotFound
router.get('/pageNotFound',userController.pageNotFound);


module.exports = router;