const express = require("express");
const router = express.Router();
const userController = require('../controllers/user/userController');


router.get('/pageNotFound',userController.pageNotFound);
router.get('/',userController.loadHomePage);
router.get('/signup',userController.signUpPage);







module.exports = router;