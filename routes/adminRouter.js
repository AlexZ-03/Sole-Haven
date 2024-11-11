const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const {userAuth, adminAuth} = require('../middlewares/auth');

router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/', adminAuth, adminController.loadDashboard);
router.get('/logout', adminController.logout);






router.get('/pageError',adminController.pageNotFound);







module.exports = router;