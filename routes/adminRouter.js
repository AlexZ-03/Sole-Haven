const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const {userAuth, adminAuth} = require('../middlewares/auth');

router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/', adminAuth, adminController.loadDashboard);
router.get('/logout', adminController.logout);

router.get('/users', adminAuth, customerController.customerInfo);
router.get('/blockCustomer', adminAuth, customerController.customerBlock);
router.get('/unblockCustomer', adminAuth, customerController.customerUnblock);



router.get('/pageError',adminController.pageNotFound);







module.exports = router;